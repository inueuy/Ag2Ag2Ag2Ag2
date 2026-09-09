import React from 'react';
import { User, ViewMode } from '../types';
import { Shield, UserCheck, LogOut, PenSquare, Layers, FileText, User as UserIcon, LogIn } from 'lucide-react';

interface NavbarProps {
  currentUser: User | null;
  currentTab: 'board' | 'pdf' | 'hwp' | 'admin' | 'my';
  onTabChange: (tab: 'board' | 'pdf' | 'hwp' | 'admin' | 'my') => void;
  onOpenAuth: (mode: 'login' | 'signup') => void;
  onOpenPostForm: () => void;
  onLogout: () => void;
  viewMode: ViewMode;
  onToggleViewMode: (mode: ViewMode) => void;
  onQuickSwitchUser: (username: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  currentTab,
  onTabChange,
  onOpenAuth,
  onOpenPostForm,
  onLogout,
  viewMode,
  onToggleViewMode,
  onQuickSwitchUser,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-[#ffffff] border-b border-[#ececed] shadow-xs">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Logo & Navigation */}
        <div className="flex items-center gap-6">
          <button
            id="nav-brand-btn"
            onClick={() => onTabChange('board')}
            className="flex items-center gap-2.5 text-left focus:outline-none group"
          >
            <div className="w-8 h-8 rounded-lg bg-[#edf5f0] border border-[#e2ece5] flex items-center justify-center text-[#315643] font-bold text-sm tracking-tight transition-transform group-hover:scale-105">
              유
            </div>
            <div>
              <span className="text-base font-bold text-[#18181b] tracking-tight group-hover:text-[#315643] transition-colors">
                유은이 팬카페
              </span>
              <span className="hidden sm:inline-block ml-2 px-1.5 py-0.5 text-[11px] font-medium rounded bg-[#f4f4f5] text-[#71717a] border border-[#eaeaea]">
                공식 커뮤니티
              </span>
            </div>
          </button>

          {/* Tab Navigation */}
          <nav className="hidden md:flex items-center gap-1.5 shrink-0">
            <button
              id="tab-board-btn"
              onClick={() => onTabChange('board')}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors border whitespace-nowrap shrink-0 ${
                currentTab === 'board'
                  ? 'bg-[#edf5f0] text-[#2e523f] border-[#e2ece5]'
                  : 'bg-transparent text-[#71717a] border-transparent hover:bg-[#f4f4f5] hover:text-[#18181b]'
              }`}
            >
              게시글 목록
            </button>

            <button
              id="tab-pdf-btn"
              onClick={() => onTabChange('pdf')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors border whitespace-nowrap shrink-0 ${
                currentTab === 'pdf'
                  ? 'bg-[#edf5f0] text-[#2e523f] border-[#e2ece5]'
                  : 'bg-transparent text-[#71717a] border-transparent hover:bg-[#f4f4f5] hover:text-[#18181b]'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              PDF 스튜디오
            </button>

            <button
              id="tab-hwp-btn"
              onClick={() => onTabChange('hwp')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors border whitespace-nowrap shrink-0 ${
                currentTab === 'hwp'
                  ? 'bg-[#edf5f0] text-[#2e523f] border-[#e2ece5]'
                  : 'bg-transparent text-[#71717a] border-transparent hover:bg-[#f4f4f5] hover:text-[#18181b]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              HWP·HWPX 스튜디오
            </button>

            {currentUser?.role === 'admin' && (
              <button
                id="tab-admin-btn"
                onClick={() => onTabChange('admin')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors border whitespace-nowrap shrink-0 ${
                  currentTab === 'admin'
                    ? 'bg-[#edf5f0] text-[#2e523f] border-[#e2ece5]'
                    : 'bg-transparent text-[#71717a] border-transparent hover:bg-[#f4f4f5] hover:text-[#18181b]'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                관리자 모드
              </button>
            )}

            {currentUser && (
              <button
                id="tab-my-btn"
                onClick={() => onTabChange('my')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors border whitespace-nowrap shrink-0 ${
                  currentTab === 'my'
                    ? 'bg-[#edf5f0] text-[#2e523f] border-[#e2ece5]'
                    : 'bg-transparent text-[#71717a] border-transparent hover:bg-[#f4f4f5] hover:text-[#18181b]'
                }`}
              >
                <UserIcon className="w-3.5 h-3.5" />
                내 정보
              </button>
            )}
          </nav>
        </div>

        {/* Center/Right: Post View Mode Switch & User controls */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Post Open Mode Selector */}
          <div
            title="게시글 열람 형태 (오픈형 모달 vs 일반 페이지 이동)"
            className="hidden sm:flex items-center p-0.5 bg-[#f4f4f5] border border-[#ececed] rounded-lg text-xs shrink-0"
          >
            <button
              id="viewmode-modal-btn"
              onClick={() => onToggleViewMode('modal')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all font-medium border whitespace-nowrap shrink-0 ${
                viewMode === 'modal'
                  ? 'bg-[#ffffff] text-[#2e523f] shadow-2xs border-[#f0f0f1]'
                  : 'bg-transparent text-[#71717a] border-transparent hover:text-[#18181b]'
              }`}
            >
              <Layers className="w-3 h-3 text-[#315643]" />
              오픈형 (모달)
            </button>
            <button
              id="viewmode-page-btn"
              onClick={() => onToggleViewMode('page')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all font-medium border whitespace-nowrap shrink-0 ${
                viewMode === 'page'
                  ? 'bg-[#ffffff] text-[#2e523f] shadow-2xs border-[#f0f0f1]'
                  : 'bg-transparent text-[#71717a] border-transparent hover:text-[#18181b]'
              }`}
            >
              <FileText className="w-3 h-3 text-[#71717a]" />
              페이지형
            </button>
          </div>

          {/* Write Button */}
          <button
            id="nav-write-btn"
            onClick={onOpenPostForm}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs sm:text-sm font-medium rounded-lg bg-[#edf5f0] hover:bg-[#e4ede7] text-[#2a4d3b] border border-[#e2ece5] transition-colors whitespace-nowrap shrink-0"
          >
            <PenSquare className="w-3.5 h-3.5" />
            글쓰기
          </button>

          {/* User Status / Auth */}
          {currentUser ? (
            <div className="flex items-center gap-2 shrink-0">
              <div className="hidden lg:flex items-center gap-2 pl-2 border-l border-[#ececed]">
                <span className="text-xs font-semibold text-[#18181b] whitespace-nowrap">
                  {currentUser.nickname}
                </span>
                {currentUser.role === 'admin' ? (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium rounded bg-[#18181b] text-white border border-[#27272a] whitespace-nowrap">
                    <Shield className="w-2.5 h-2.5" />
                    관리자
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium rounded bg-[#edf5f0] text-[#2e523f] border border-[#e2ece5] whitespace-nowrap">
                    <UserCheck className="w-2.5 h-2.5" />
                    일반회원
                  </span>
                )}
              </div>

              <button
                id="nav-logout-btn"
                onClick={onLogout}
                title="로그아웃"
                className="p-1.5 rounded-lg bg-[#f4f4f5] hover:bg-[#eaeaea] text-[#71717a] hover:text-[#18181b] border border-[#e8e8ea] transition-colors shrink-0"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                id="nav-login-btn"
                onClick={() => onOpenAuth('login')}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg bg-[#f4f4f5] hover:bg-[#eaeaea] text-[#27272a] border border-[#e8e8ea] transition-colors whitespace-nowrap shrink-0"
              >
                <LogIn className="w-3.5 h-3.5" />
                로그인
              </button>
              <button
                id="nav-signup-btn"
                onClick={() => onOpenAuth('signup')}
                className="inline-flex items-center px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg bg-[#18181b] hover:bg-[#27272a] text-[#f4f4f5] border border-[#27272a] transition-colors whitespace-nowrap shrink-0"
              >
                회원가입
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Tab Bar */}
      <div className="md:hidden flex items-center gap-1 px-4 py-2 border-t border-[#ececed] overflow-x-auto bg-[#ffffff]">
        <button
          onClick={() => onTabChange('board')}
          className={`px-2.5 py-1 text-xs font-medium rounded-md whitespace-nowrap ${
            currentTab === 'board'
              ? 'bg-[#edf5f0] text-[#2e523f]'
              : 'text-[#71717a]'
          }`}
        >
          게시글 목록
        </button>
        <button
          onClick={() => onTabChange('pdf')}
          className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md whitespace-nowrap ${
            currentTab === 'pdf'
              ? 'bg-[#edf5f0] text-[#2e523f]'
              : 'text-[#71717a]'
          }`}
        >
          <FileText className="w-3 h-3" />
          PDF
        </button>
        <button
          onClick={() => onTabChange('hwp')}
          className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md whitespace-nowrap ${
            currentTab === 'hwp'
              ? 'bg-[#edf5f0] text-[#2e523f]'
              : 'text-[#71717a]'
          }`}
        >
          <Layers className="w-3 h-3" />
          HWP·HWPX
        </button>
        {currentUser?.role === 'admin' && (
          <button
            onClick={() => onTabChange('admin')}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md whitespace-nowrap ${
              currentTab === 'admin'
                ? 'bg-[#edf5f0] text-[#2e523f]'
                : 'text-[#71717a]'
            }`}
          >
            <Shield className="w-3 h-3" />
            관리자
          </button>
        )}
        {currentUser && (
          <button
            onClick={() => onTabChange('my')}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md whitespace-nowrap ${
              currentTab === 'my'
                ? 'bg-[#edf5f0] text-[#2e523f]'
                : 'text-[#71717a]'
            }`}
          >
            <UserIcon className="w-3 h-3" />
            내 정보
          </button>
        )}
      </div>

      {/* Quick Account Test Switcher Bar (Useful for instantly verifying admin vs regular member without manual relogging) */}
      <div className="bg-[#fafafa] border-t border-[#f0f0f1] px-4 py-1.5 text-xs flex items-center justify-between text-[#71717a] overflow-x-auto">
        <div className="flex items-center gap-2 shrink-0">
          <span className="font-medium text-[#52525b]">테스트 아이디 자동로그인:</span>
          <button
            onClick={() => onQuickSwitchUser('test01@mail.com')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium border transition-colors ${
              currentUser?.username === 'test01@mail.com'
                ? 'bg-[#edf5f0] text-[#2e523f] border-[#e2ece5]'
                : 'bg-[#ffffff] text-[#71717a] border-[#e5e5e7] hover:bg-[#f4f4f5]'
            }`}
          >
            test01 (은이바라기)
          </button>
          <button
            onClick={() => onQuickSwitchUser('test02@mail.com')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium border transition-colors ${
              currentUser?.username === 'test02@mail.com'
                ? 'bg-[#edf5f0] text-[#2e523f] border-[#e2ece5]'
                : 'bg-[#ffffff] text-[#71717a] border-[#e5e5e7] hover:bg-[#f4f4f5]'
            }`}
          >
            test02 (햇살은이)
          </button>
          <button
            onClick={() => onQuickSwitchUser('test03@mail.com')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium border transition-colors ${
              currentUser?.username === 'test03@mail.com'
                ? 'bg-[#edf5f0] text-[#2e523f] border-[#e2ece5]'
                : 'bg-[#ffffff] text-[#71717a] border-[#e5e5e7] hover:bg-[#f4f4f5]'
            }`}
          >
            test03 (은이누나팬)
          </button>
          <button
            onClick={() => onQuickSwitchUser('admin')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium border transition-colors ${
              currentUser?.username === 'admin'
                ? 'bg-[#edf5f0] text-[#2e523f] border-[#e2ece5]'
                : 'bg-[#ffffff] text-[#71717a] border-[#e5e5e7] hover:bg-[#f4f4f5]'
            }`}
          >
            관리자 (admin)
          </button>
          <button
            onClick={() => onQuickSwitchUser('guest')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium border transition-colors ${
              !currentUser
                ? 'bg-[#edf5f0] text-[#2e523f] border-[#e2ece5]'
                : 'bg-[#ffffff] text-[#71717a] border-[#e5e5e7] hover:bg-[#f4f4f5]'
            }`}
          >
            비회원(게스트)
          </button>
        </div>

        <div className="hidden md:flex items-center gap-3 shrink-0 text-[11px] text-[#a1a1aa]">
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#f4f7f5] text-[#2c5340] border border-[#e0ece4]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#315643] animate-pulse"></span>
            Firebase DB 연동 (proj-ag2)
          </span>
          <span>현재 열람 모드: <strong className="text-[#315643]">{viewMode === 'modal' ? '오픈형 (닫기)' : '페이지형 (뒤로가기)'}</strong></span>
        </div>
      </div>
    </header>
  );
};
