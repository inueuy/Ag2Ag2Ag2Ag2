import { useState, useEffect } from 'react';
import { User, Post, ViewMode, PostFilter } from './types';
import { locaDB } from './services/locadb';
import { Navbar } from './components/Navbar';
import { PostList } from './components/PostList';
import { PostDetail } from './components/PostDetail';
import { PostFormModal } from './components/PostFormModal';
import { AuthModal } from './components/AuthModal';
import { AdminDashboard } from './components/AdminDashboard';
import { MyPageModal } from './components/MyPageModal';
import { PdfWorkspace } from './components/PdfWorkspace';
import { HwpWorkspace } from './components/HwpWorkspace';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => locaDB.getCurrentUser());
  const [posts, setPosts] = useState<Post[]>(() => locaDB.getPosts());
  const [currentTab, setCurrentTab] = useState<'board' | 'pdf' | 'hwp' | 'admin' | 'my'>('board');
  const [selectedCategory, setSelectedCategory] = useState<string>('전체');
  const [postFilter, setPostFilter] = useState<PostFilter>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('modal');

  // Active Post for Detail View
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);

  // Modals
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('login');
  const [isPostFormOpen, setIsPostFormOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);

  const refreshData = () => {
    setCurrentUser(locaDB.getCurrentUser());
    setPosts(locaDB.getPosts());
  };

  useEffect(() => {
    const handleLocaDBChange = () => {
      refreshData();
    };
    window.addEventListener('locadb_changed', handleLocaDBChange);
    return () => {
      window.removeEventListener('locadb_changed', handleLocaDBChange);
    };
  }, []);

  // Post view handler
  const handleSelectPost = (post: Post) => {
    setSelectedPostId(post.id);
  };

  // Close post in modal view (오픈형 닫기)
  const handleClosePostModal = () => {
    setSelectedPostId(null);
  };

  // Back to list in page view (페이지형 뒤로가기)
  const handleBackToList = () => {
    setSelectedPostId(null);
  };

  const handleOpenAuth = (mode: 'login' | 'signup') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const handleLogout = () => {
    locaDB.clearSession();
    setCurrentUser(null);
    if (currentTab === 'admin' || currentTab === 'my') {
      setCurrentTab('board');
    }
  };

  const handleOpenWrite = () => {
    if (!currentUser) {
      handleOpenAuth('login');
      return;
    }
    setEditingPost(null);
    setIsPostFormOpen(true);
  };

  const handleEditPost = (post: Post) => {
    setEditingPost(post);
    setIsPostFormOpen(true);
  };

  const handleQuickSwitchUser = (username: string) => {
    if (username === 'guest') {
      locaDB.clearSession();
      setCurrentUser(null);
      if (currentTab === 'admin' || currentTab === 'my') {
        setCurrentTab('board');
      }
      return;
    }

    const targetUser = locaDB.findUserByUsername(username);
    if (targetUser) {
      locaDB.setCurrentUser(targetUser);
      setCurrentUser(targetUser);
    }
  };

  return (
    <div className="min-h-screen bg-[#fcfcfd] text-[#1e2022] flex flex-col font-sans">
      {/* Navigation Header */}
      <Navbar
        currentUser={currentUser}
        currentTab={currentTab}
        onTabChange={(tab) => {
          setCurrentTab(tab);
          // If moving tabs, clear single post page view
          if (viewMode === 'page') {
            setSelectedPostId(null);
          }
        }}
        onOpenAuth={handleOpenAuth}
        onOpenPostForm={handleOpenWrite}
        onLogout={handleLogout}
        viewMode={viewMode}
        onToggleViewMode={setViewMode}
        onQuickSwitchUser={handleQuickSwitchUser}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* TAB 1: BOARD VIEW */}
        {currentTab === 'board' && (
          <>
            {/* If Page Mode is selected and a post is active, show PostDetail inline with [뒤로가기] button */}
            {viewMode === 'page' && selectedPostId ? (
              <PostDetail
                postId={selectedPostId}
                isOpenType={false} // Page mode -> 뒤로가기 버튼
                currentUser={currentUser}
                onClose={handleClosePostModal}
                onBack={handleBackToList}
                onEdit={handleEditPost}
                onPostDeleted={() => {
                  setSelectedPostId(null);
                  refreshData();
                }}
                onRequireAuth={() => handleOpenAuth('login')}
              />
            ) : (
              <PostList
                posts={posts}
                currentUser={currentUser}
                selectedCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
                postFilter={postFilter}
                onChangePostFilter={setPostFilter}
                viewMode={viewMode}
                onToggleViewMode={setViewMode}
                onSelectPost={handleSelectPost}
                onOpenWriteModal={handleOpenWrite}
              />
            )}

            {/* If Modal Mode is selected and a post is active, show PostDetail as overlay with [닫기] button */}
            {viewMode === 'modal' && selectedPostId && (
              <PostDetail
                postId={selectedPostId}
                isOpenType={true} // Modal mode -> 닫기 버튼
                currentUser={currentUser}
                onClose={handleClosePostModal}
                onBack={handleBackToList}
                onEdit={handleEditPost}
                onPostDeleted={() => {
                  setSelectedPostId(null);
                  refreshData();
                }}
                onRequireAuth={() => handleOpenAuth('login')}
              />
            )}
          </>
        )}

        {/* TAB 2: PDF WORKSPACE (생성, 병합, 분할, 관리) */}
        {currentTab === 'pdf' && (
          <PdfWorkspace currentUser={currentUser} />
        )}

        {/* TAB 3: HWP & HWPX WORKSPACE (rhwp 뷰어, 편집기, 포맷 변환) */}
        {currentTab === 'hwp' && (
          <HwpWorkspace currentUser={currentUser} />
        )}

        {/* TAB 3: ADMIN VIEW (Only available to Admin) */}
        {currentTab === 'admin' && currentUser?.role === 'admin' && (
          <AdminDashboard
            currentUser={currentUser}
            posts={posts}
            onSelectPost={(post) => {
              setSelectedPostId(post.id);
              if (viewMode === 'page') {
                setCurrentTab('board');
              }
            }}
            onRefreshData={refreshData}
          />
        )}

        {/* If user tries to access admin without permissions */}
        {currentTab === 'admin' && currentUser?.role !== 'admin' && (
          <div className="bg-[#ffffff] p-8 text-center rounded-2xl border border-[#ececed]">
            <p className="text-sm font-semibold text-[#9c3a3a] mb-2">
              관리자 전용 페이지입니다.
            </p>
            <p className="text-xs text-[#71717a] mb-4">
              관리자 계정으로 로그인 후 이용해 주세요.
            </p>
            <button
              onClick={() => handleQuickSwitchUser('admin')}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-[#edf5f0] text-[#2c5340] border border-[#e0ece4] hover:bg-[#e4ede7]"
            >
              관리자(admin) 계정으로 전환
            </button>
          </div>
        )}

        {/* TAB 3: MY PAGE VIEW */}
        {currentTab === 'my' && currentUser && (
          <MyPageModal
            currentUser={currentUser}
            posts={posts}
            onSelectPost={(post) => {
              setSelectedPostId(post.id);
              if (viewMode === 'page') {
                setCurrentTab('board');
              }
            }}
            onEditPost={handleEditPost}
            onRefreshData={refreshData}
            onLogout={handleLogout}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-[#ececed] bg-[#ffffff] py-6 text-xs text-[#71717a]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#315643]"></span>
            <span className="font-semibold text-[#18181b]">회원제 게시판</span>
            <span className="text-[#a1a1aa]">• 로컬 DB (locadb) 연동</span>
          </div>

          <div className="flex items-center gap-4 text-[11px] text-[#a1a1aa]">
            <span>무채색 베이스 & 파스텔 세이지 포인트</span>
            <span>•</span>
            <span>톤온톤 버튼 스타일링</span>
          </div>
        </div>
      </footer>

      {/* Global Post Form Modal */}
      <PostFormModal
        isOpen={isPostFormOpen}
        editPost={editingPost}
        currentUser={currentUser}
        onClose={() => {
          setIsPostFormOpen(false);
          setEditingPost(null);
        }}
        onSuccess={() => {
          refreshData();
        }}
        onRequireAuth={() => handleOpenAuth('login')}
      />

      {/* Global Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        initialMode={authModalMode}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={(user) => {
          setCurrentUser(user);
          refreshData();
        }}
      />
    </div>
  );
}
