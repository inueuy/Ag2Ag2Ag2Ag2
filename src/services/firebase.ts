import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAnalytics, isSupported } from 'firebase/analytics';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  getDocFromServer,
  Firestore,
} from 'firebase/firestore';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  Auth,
} from 'firebase/auth';
import { User, Post, Comment } from '../types';

// Web app's Firebase configuration requested by user
export const firebaseConfig = {
  apiKey: 'AIzaSyBrgFwkhA8oq34Q15r38Wmm_PsbnrXRwdU',
  authDomain: 'proj-ag2.firebaseapp.com',
  projectId: 'proj-ag2',
  storageBucket: 'proj-ag2.firebasestorage.app',
  messagingSenderId: '700117145477',
  appId: '1:700117145477:web:294f35ee261bea4a56d6ec',
  measurementId: 'G-7VEJ0M1Q84',
};

// Database ID provisioned by Firebase for this applet
const FIRESTORE_DATABASE_ID = 'ai-studio-21164384-b577-445e-85e3-97722c3648dc';

// Initialize Firebase App singleton
export const app: FirebaseApp =
  getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Analytics conditionally (safely handles SSR or iframe environment)
if (typeof window !== 'undefined') {
  isSupported()
    .then((supported) => {
      if (supported) {
        getAnalytics(app);
      }
    })
    .catch(() => {
      // Analytics not supported in this environment
    });
}

// Initialize Firestore with fallback
let firestoreInstance: Firestore;
try {
  firestoreInstance = getFirestore(app, FIRESTORE_DATABASE_ID);
} catch {
  firestoreInstance = getFirestore(app);
}
export const db = firestoreInstance;

// Initialize Firebase Auth
export const auth: Auth = getAuth(app);

// Test connection on boot as required by firebase-skill
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('[Firebase] Firestore connected successfully to proj-ag2');
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('[Firebase] Client is offline or database connection pending.');
    } else {
      console.log('[Firebase] Connection check completed:', error);
    }
    return false;
  }
}
testConnection();
