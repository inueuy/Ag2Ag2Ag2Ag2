import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { HwpDocFormat } from './hwpService';

export interface HwpRecord {
  id: string;
  title: string;
  fileName: string;
  format: HwpDocFormat;
  pageCount: number;
  fileSize: number;
  createdAt: number;
  userId?: string;
  userNickname?: string;
  dataBase64?: string; // Stored document data if small, otherwise summary
}

const LOCAL_STORAGE_KEY = 'locadb_hwp_records';

function getLocalHwpRecords(): HwpRecord[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalHwpRecords(records: HwpRecord[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(records));
  } catch (err) {
    console.warn('[HWP Local Storage] Quota exceeded or error saving:', err);
  }
}

export async function saveHwpRecord(record: Omit<HwpRecord, 'id' | 'createdAt'>): Promise<HwpRecord> {
  const newRecord: HwpRecord = {
    ...record,
    id: 'hwp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    createdAt: Date.now(),
  };

  // 1. Save to Local Storage immediately
  const localList = getLocalHwpRecords();
  localList.unshift(newRecord);
  saveLocalHwpRecords(localList.slice(0, 50));

  // 2. Sync to Firebase Firestore if configured
  if (db) {
    try {
      const docRef = await addDoc(collection(db, 'hwp_documents'), {
        title: record.title,
        fileName: record.fileName,
        format: record.format,
        pageCount: record.pageCount,
        fileSize: record.fileSize,
        userId: record.userId || 'guest',
        userNickname: record.userNickname || '방문자',
        createdAt: serverTimestamp(),
      });
      newRecord.id = docRef.id;
    } catch (err) {
      console.warn('[Firestore] Failed to save HWP document to cloud:', err);
    }
  }

  return newRecord;
}

export async function getHwpRecords(): Promise<HwpRecord[]> {
  if (db) {
    try {
      const q = query(collection(db, 'hwp_documents'), orderBy('createdAt', 'desc'), limit(50));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const records: HwpRecord[] = snapshot.docs.map((d) => {
          const data = d.data();
          const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : Date.now();
          return {
            id: d.id,
            title: data.title || '무제 문서',
            fileName: data.fileName || 'document.hwpx',
            format: (data.format as HwpDocFormat) || 'hwpx',
            pageCount: data.pageCount || 1,
            fileSize: data.fileSize || 0,
            createdAt,
            userId: data.userId,
            userNickname: data.userNickname,
          };
        });
        saveLocalHwpRecords(records);
        return records;
      }
    } catch (err) {
      console.warn('[Firestore] Error fetching HWP records, using local cache:', err);
    }
  }

  return getLocalHwpRecords();
}

export async function deleteHwpRecord(recordId: string): Promise<void> {
  const localList = getLocalHwpRecords().filter((r) => r.id !== recordId);
  saveLocalHwpRecords(localList);

  if (db) {
    try {
      await deleteDoc(doc(db, 'hwp_documents', recordId));
    } catch (err) {
      console.warn('[Firestore] Error deleting HWP document:', err);
    }
  }
}
