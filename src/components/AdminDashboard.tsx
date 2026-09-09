import React, { useState } from 'react';
import { User, Post, Role, UserStatus } from '../types';
import { locaDB } from '../services/locadb';
import {
  Shield,
  Users,
  FileText,
  Search,
  CheckCircle2,
  Ban,
  Trash2,
  Pin,
  RefreshCw,
  Eye,
  Heart,
  MessageSquare,
  AlertTriangle,
  Hash,
} from 'lucide-react';

interface AdminDashboardProps {
  currentUser: User;
  posts: Post[];
  onSelectPost: (post: Post) => void;
  onRefreshData: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  currentUser,
  posts,
  onSelectPost,
  onRefreshData,
}) => {
  const [activeTab, setActiveTab] = useState<'members' | 'posts'>('members');
  const [searchMember, setSearchMember] = useState('');
  const [searchPost, setSearchPost] = useState('');

  const users = locaDB.getUsers();

  // Metrics
  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.status === 'active').length;
  const suspendedUsers = users.filter((u) => u.status === 'suspended').length;
  const totalPosts = posts.length;
  const noticePosts = posts.filter((p) => p.isNotice).length;
  const totalComments = locaDB.getAllComments().length;

  // Filtered users
  const filteredUsers = users.filter((u) => {
    if (!searchMember.trim()) return true;
    const q = searchMember.toLowerCase();
    return (
      u.username.toLowerCase().includes(q) ||
      u.nickname.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
    );
  });

  // Filtered posts
  const filteredPosts = posts.filter((p) => {
    if (!searchPost.trim()) return true;
    const q = searchPost.toLowerCase();
    return (
      p.title.toLowerCase().includes(q) ||
      p.authorNickname.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.tags?.some((t) => t.toLowerCase().includes(q))
    );
  });

  const handleToggleStatus = (targetUser: User) => {
    if (targetUser.id === currentUser.id) {
      alert('현재 로그인된 본인 계정의 상태는 변경할 수 없습니다.');
      return;
    }
    const nextStatus: UserStatus = targetUser.status === 'active' ? 'suspended' : 'active';
    const msg =
      nextStatus === 'suspended'
        ? `'${targetUser.nickname}' 회원을 이용정지 처리하시겠습니까?`
        : `'${targetUser.nickname}' 회원의 정지를 해제하시겠습니까?`;

    if (window.confirm(msg)) {
      locaDB.updateUser(targetUser.id, { status: nextStatus });
      onRefreshData();
    }
  };

  const handleToggleRole = (targetUser: User) => {
    if (targetUser.id === currentUser.id) {
      alert('본인 관리자 권한은 해제할 수 없습니다.');
      return;
    }
    const nextRole: Role = targetUser.role === 'admin' ? 'user' : 'admin';
    const msg =
      nextRole === 'admin'
        ? `'${targetUser.nickname}' 회원에게 관리자 권한을 부여하시겠습니까?`
        : `'${targetUser.nickname}' 회원의 관리자 권한을 회수하시겠습니까?`;

    if (window.confirm(msg)) {
      locaDB.updateUser(targetUser.id, { role: nextRole });
      onRefreshData();
    }
  };

  const handleDeleteUser = (targetUser: User) => {
    if (targetUser.id === currentUser.id) {
      alert('본인 계정은 삭제할 수 없습니다.');
      return;
    }
    if (
      window.confirm(
        `'${targetUser.nickname}'(${targetUser.username}) 회원을 영구 삭제(강제 탈퇴)하시겠습니까?`
      )
    ) {
      const res = locaDB.deleteUser(targetUser.id);
      if (res.success) {
        onRefreshData();
      } else {
        alert(res.message || '회원 삭제에 실패했습니다.');
      }
    }
  };

  const handleToggleNotice = (post: Post) => {
    locaDB.updatePost(post.id, { isNotice: !post.isNotice }, currentUser);
    onRefreshData();
  };

  const handleDeletePost = (post: Post) => {
    if (window.confirm(`'${post.title}' 게시글을 관리자 권한으로 삭제하시겠습니까?`)) {
      const res = locaDB.deletePost(post.id, currentUser);
      if (res.success) {
        onRefreshData();
      } else {
        alert(res.message || '게시글 삭제 실패');
      }
    }
  };

  const handleResetDatabase = () => {
    if (
      window.confirm(
        'locaDB를 초기 예시 데이터(기본 회원 및 게시글)로 전체 초기화하시겠습니까?'
      )
    ) {
      locaDB.initDatabase(true);
      onRefreshData();
      alert('데이터베이스가 초기화되었습니다.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Stats Banner */}
      <div className="bg-[#ffffff] p-6 rounded-2xl border border-[#ececed] shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#f4f4f5]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#edf5f0] border border-[#e0ece4] flex items-center justify-center text-[#315643]">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#18181b]">
                관리자 대시보드
              </h2>
              <p className="text-xs text-[#71717a]">
                회원 계정 및 전체 게시글을 종합 관리합니다.
              </p>
            </div>
          </div>

          <button
            onClick={handleResetDatabase}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl bg-[#f4f4f5] hover:bg-[#eaeaea] text-[#52525b] border border-[#e8e8ea] transition-colors self-start sm:self-auto"
            title="기본 샘플 데이터로 리셋"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            DB 초기 샘플로 복원
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6">
          <div className="p-3.5 rounded-xl bg-[#fafafa] border border-[#f0f0f1]">
            <span className="text-xs text-[#71717a]">전체 회원</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-xl font-bold text-[#18181b]">{totalUsers}</span>
              <span className="text-[11px] text-[#315643]">활동 {activeUsers}명</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#fafafa] border border-[#f0f0f1]">
            <span className="text-xs text-[#71717a]">정지 회원</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-xl font-bold text-[#9c3a3a]">{suspendedUsers}</span>
              <span className="text-[11px] text-[#71717a]">명</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#fafafa] border border-[#f0f0f1]">
            <span className="text-xs text-[#71717a]">전체 게시글</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-xl font-bold text-[#18181b]">{totalPosts}</span>
              <span className="text-[11px] text-[#315643]">공지 {noticePosts}건</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#fafafa] border border-[#f0f0f1]">
            <span className="text-xs text-[#71717a]">전체 댓글</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-xl font-bold text-[#18181b]">{totalComments}</span>
              <span className="text-[11px] text-[#71717a]">개</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs: 회원관리 vs 전체 글관리 */}
      <div className="flex items-center gap-2 border-b border-[#ececed] pb-2">
        <button
          onClick={() => setActiveTab('members')}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl border transition-all ${
            activeTab === 'members'
              ? 'bg-[#edf5f0] text-[#2c5340] border-[#e0ece4]'
              : 'bg-transparent text-[#71717a] border-transparent hover:bg-[#f4f4f5] hover:text-[#18181b]'
          }`}
        >
          <Users className="w-4 h-4" />
          회원 관리 ({users.length})
        </button>

        <button
          onClick={() => setActiveTab('posts')}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl border transition-all ${
            activeTab === 'posts'
              ? 'bg-[#edf5f0] text-[#2c5340] border-[#e0ece4]'
              : 'bg-transparent text-[#71717a] border-transparent hover:bg-[#f4f4f5] hover:text-[#18181b]'
          }`}
        >
          <FileText className="w-4 h-4" />
          회원들의 전체 글 관리 ({posts.length})
        </button>
      </div>

      {/* TAB 1: 회원 관리 (Member Management) */}
      {activeTab === 'members' && (
        <div className="space-y-4">
          {/* Member Search */}
          <div className="flex items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <input
                type="text"
                value={searchMember}
                onChange={(e) => setSearchMember(e.target.value)}
                placeholder="아이디, 닉네임, 이메일 검색"
                className="w-full pl-8 pr-3 py-2 text-xs bg-[#ffffff] border border-[#e4e4e7] rounded-xl text-[#18181b] placeholder-[#a1a1aa] focus:outline-none focus:ring-1 focus:ring-[#7ca98e] focus:border-[#7ca98e] transition-colors"
              />
              <Search className="w-3.5 h-3.5 text-[#a1a1aa] absolute left-2.5 top-2.5 pointer-events-none" />
            </div>
            <span className="text-xs text-[#71717a]">
              검색 결과: <strong className="text-[#18181b]">{filteredUsers.length}</strong>명
            </span>
          </div>

          {/* Member Table */}
          <div className="bg-[#ffffff] rounded-2xl border border-[#ececed] overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#fafafa] border-b border-[#f0f0f1] text-[#71717a] font-medium">
                  <tr>
                    <th className="py-3 px-4">회원 정보</th>
                    <th className="py-3 px-4">이메일</th>
                    <th className="py-3 px-4">역할(권한)</th>
                    <th className="py-3 px-4">계정 상태</th>
                    <th className="py-3 px-4">작성글 수</th>
                    <th className="py-3 px-4 text-right">관리 작업</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f4f4f5]">
                  {filteredUsers.map((user) => {
                    const isSelf = user.id === currentUser.id;
                    const userPostsCount = posts.filter((p) => p.authorId === user.id).length;

                    return (
                      <tr key={user.id} className="hover:bg-[#fafafa] transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <span className="w-7 h-7 rounded-full bg-[#f4f4f5] border border-[#ececed] flex items-center justify-center font-bold text-[#52525b]">
                              {user.nickname.slice(0, 1)}
                            </span>
                            <div>
                              <div className="font-semibold text-[#18181b] flex items-center gap-1">
                                <span>{user.nickname}</span>
                                {isSelf && (
                                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#f4f4f5] text-[#71717a] border border-[#e8e8ea]">
                                    나
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-[#a1a1aa]">@{user.username}</span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-[#52525b]">
                          {user.email}
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border ${
                              user.role === 'admin'
                                ? 'bg-[#edf5f0] text-[#2c5340] border-[#e0ece4]'
                                : 'bg-[#f4f4f5] text-[#52525b] border-[#e8e8ea]'
                            }`}
                          >
                            {user.role === 'admin' ? (
                              <>
                                <Shield className="w-2.5 h-2.5" />
                                관리자
                              </>
                            ) : (
                              '일반회원'
                            )}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border ${
                              user.status === 'active'
                                ? 'bg-[#edf5f0] text-[#2c5340] border-[#e0ece4]'
                                : 'bg-[#fdf2f2] text-[#9c3a3a] border-[#fae2e2]'
                            }`}
                          >
                            {user.status === 'active' ? (
                              <>
                                <CheckCircle2 className="w-2.5 h-2.5" />
                                정상 활동
                              </>
                            ) : (
                              <>
                                <Ban className="w-2.5 h-2.5" />
                                이용 정지
                              </>
                            )}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 font-mono text-[#52525b]">
                          {userPostsCount}건
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Role toggle button */}
                            <button
                              onClick={() => handleToggleRole(user)}
                              disabled={isSelf}
                              title={user.role === 'admin' ? '일반회원으로 강등' : '관리자로 승격'}
                              className="px-2 py-1 text-[11px] font-medium rounded-lg bg-[#f4f4f5] hover:bg-[#eaeaea] text-[#27272a] border border-[#e8e8ea] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              {user.role === 'admin' ? '관리자 해제' : '관리자 지정'}
                            </button>

                            {/* Status toggle button */}
                            <button
                              onClick={() => handleToggleStatus(user)}
                              disabled={isSelf}
                              title={user.status === 'active' ? '계정 정지' : '정지 해제'}
                              className={`px-2 py-1 text-[11px] font-medium rounded-lg border transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
                                user.status === 'active'
                                  ? 'bg-[#fdf2f2] hover:bg-[#fae2e2] text-[#9c3a3a] border-[#fae2e2]'
                                  : 'bg-[#edf5f0] hover:bg-[#e4ede7] text-[#2c5340] border-[#e0ece4]'
                              }`}
                            >
                              {user.status === 'active' ? '정지' : '정지 해제'}
                            </button>

                            {/* Delete User */}
                            <button
                              onClick={() => handleDeleteUser(user)}
                              disabled={isSelf}
                              title="회원 강제 탈퇴(삭제)"
                              className="p-1 rounded-lg bg-[#f4f4f5] hover:bg-[#fdf2f2] text-[#71717a] hover:text-[#9c3a3a] border border-[#e8e8ea] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: 회원들의 전체 글 관리 (All Posts Management) */}
      {activeTab === 'posts' && (
        <div className="space-y-4">
          {/* Post Search */}
          <div className="flex items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <input
                type="text"
                value={searchPost}
                onChange={(e) => setSearchPost(e.target.value)}
                placeholder="제목, 작성자, 카테고리 검색"
                className="w-full pl-8 pr-3 py-2 text-xs bg-[#ffffff] border border-[#e4e4e7] rounded-xl text-[#18181b] placeholder-[#a1a1aa] focus:outline-none focus:ring-1 focus:ring-[#7ca98e] focus:border-[#7ca98e] transition-colors"
              />
              <Search className="w-3.5 h-3.5 text-[#a1a1aa] absolute left-2.5 top-2.5 pointer-events-none" />
            </div>
            <span className="text-xs text-[#71717a]">
              총 <strong className="text-[#18181b]">{filteredPosts.length}</strong>개의 게시글
            </span>
          </div>

          {/* Posts Table */}
          <div className="bg-[#ffffff] rounded-2xl border border-[#ececed] overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#fafafa] border-b border-[#f0f0f1] text-[#71717a] font-medium">
                  <tr>
                    <th className="py-3 px-4">카테고리</th>
                    <th className="py-3 px-4">게시글 제목</th>
                    <th className="py-3 px-4">작성자</th>
                    <th className="py-3 px-4">등록일</th>
                    <th className="py-3 px-4">반응(조회/좋아요/댓글)</th>
                    <th className="py-3 px-4 text-right">관리 작업</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f4f4f5]">
                  {filteredPosts.map((post) => {
                    const dateStr = new Date(post.createdAt).toLocaleDateString('ko-KR', {
                      year: '2-digit',
                      month: '2-digit',
                      day: '2-digit',
                    });

                    return (
                      <tr key={post.id} className="hover:bg-[#fafafa] transition-colors">
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#edf5f0] text-[#2c5340] border border-[#e0ece4]">
                            {post.category}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 max-w-xs sm:max-w-sm">
                          <div className="flex items-center gap-1.5">
                            {post.isNotice && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] bg-[#18181b] text-white border border-[#27272a] shrink-0">
                                <Pin className="w-2.5 h-2.5" />
                                공지
                              </span>
                            )}
                            <button
                              onClick={() => onSelectPost(post)}
                              className="font-semibold text-[#18181b] hover:text-[#315643] text-left truncate transition-colors"
                            >
                              {post.title}
                            </button>
                          </div>
                          {post.tags && post.tags.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1 mt-1">
                              {post.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="inline-flex items-center gap-0.5 px-1.5 py-0.2 text-[10px] rounded bg-[#edf5f0] text-[#2c5340] border border-[#e0ece4]"
                                >
                                  <Hash className="w-2 h-2 opacity-60" />
                                  {tag.replace(/^#/, '')}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-[#52525b]">
                          <div className="flex items-center gap-1">
                            <span>{post.authorNickname}</span>
                            {post.authorRole === 'admin' && (
                              <span title="관리자">
                                <Shield className="w-3 h-3 text-[#315643]" />
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-[#a1a1aa] font-mono">
                          {dateStr}
                        </td>

                        <td className="py-3.5 px-4 text-[#71717a]">
                          <div className="flex items-center gap-2 text-[11px]">
                            <span className="flex items-center gap-0.5">
                              <Eye className="w-3 h-3 text-[#a1a1aa]" />
                              {post.views}
                            </span>
                            <span className="flex items-center gap-0.5">
                              <Heart className="w-3 h-3 text-[#a1a1aa]" />
                              {post.likes}
                            </span>
                            <span className="flex items-center gap-0.5">
                              <MessageSquare className="w-3 h-3 text-[#a1a1aa]" />
                              {post.commentsCount}
                            </span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Notice toggle */}
                            <button
                              onClick={() => handleToggleNotice(post)}
                              className={`px-2 py-1 text-[11px] font-medium rounded-lg border transition-colors ${
                                post.isNotice
                                  ? 'bg-[#edf5f0] text-[#2c5340] border-[#e0ece4]'
                                  : 'bg-[#f4f4f5] text-[#52525b] border-[#e8e8ea] hover:bg-[#eaeaea]'
                              }`}
                            >
                              {post.isNotice ? '공지 해제' : '공지 지정'}
                            </button>

                            {/* View Post */}
                            <button
                              onClick={() => onSelectPost(post)}
                              className="px-2 py-1 text-[11px] font-medium rounded-lg bg-[#f4f4f5] hover:bg-[#eaeaea] text-[#27272a] border border-[#e8e8ea] transition-colors"
                            >
                              보기
                            </button>

                            {/* Delete Post */}
                            <button
                              onClick={() => handleDeletePost(post)}
                              title="관리자 삭제"
                              className="p-1 rounded-lg bg-[#fdf2f2] hover:bg-[#fae2e2] text-[#9c3a3a] border border-[#fae2e2] transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
