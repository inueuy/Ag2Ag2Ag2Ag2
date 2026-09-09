import React, { useState } from 'react';
import { User, Post } from '../types';
import { locaDB } from '../services/locadb';
import { User as UserIcon, Shield, Edit3, Key, FileText, CheckCircle2, AlertCircle, Trash2 } from 'lucide-react';

interface MyPageModalProps {
  currentUser: User;
  posts: Post[];
  onSelectPost: (post: Post) => void;
  onEditPost: (post: Post) => void;
  onRefreshData: () => void;
  onLogout: () => void;
}

export const MyPageModal: React.FC<MyPageModalProps> = ({
  currentUser,
  posts,
  onSelectPost,
  onEditPost,
  onRefreshData,
  onLogout,
}) => {
  const [nickname, setNickname] = useState(currentUser.nickname);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [msg, setMsg] = useState<{ text: string; isError: boolean } | null>(null);

  const myPosts = posts.filter((p) => p.authorId === currentUser.id);
  const myCommentsCount = locaDB
    .getAllComments()
    .filter((c) => c.authorId === currentUser.id).length;

  const handleUpdateNickname = (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);

    if (!nickname.trim()) {
      setMsg({ text: '닉네임을 입력해 주세요.', isError: true });
      return;
    }

    const res = locaDB.updateUser(currentUser.id, { nickname: nickname.trim() });
    if (res.success) {
      setMsg({ text: '닉네임이 성공적으로 변경되었습니다.', isError: false });
      onRefreshData();
    } else {
      setMsg({ text: res.message || '닉네임 변경에 실패했습니다.', isError: true });
    }
  };

  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);

    if (newPassword.length < 4) {
      setMsg({ text: '비밀번호는 최소 4자 이상이어야 합니다.', isError: true });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMsg({ text: '비밀번호가 일치하지 않습니다.', isError: true });
      return;
    }

    const res = locaDB.updateUser(currentUser.id, { password: newPassword });
    if (res.success) {
      setMsg({ text: '비밀번호가 안전하게 변경되었습니다.', isError: false });
      setNewPassword('');
      setConfirmPassword('');
      onRefreshData();
    } else {
      setMsg({ text: res.message || '비밀번호 변경 실패', isError: true });
    }
  };

  const handleDeletePost = (post: Post) => {
    if (window.confirm(`'${post.title}' 게시글을 삭제하시겠습니까?`)) {
      locaDB.deletePost(post.id, currentUser);
      onRefreshData();
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Profile Overview Card */}
      <div className="bg-[#ffffff] p-6 sm:p-8 rounded-2xl border border-[#ececed] shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#f4f4f5]">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#edf5f0] border border-[#e0ece4] flex items-center justify-center text-[#315643] text-xl font-bold">
              {currentUser.nickname.slice(0, 1)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-[#18181b]">
                  {currentUser.nickname}
                </h2>
                {currentUser.role === 'admin' ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded bg-[#18181b] text-white border border-[#27272a]">
                    <Shield className="w-3 h-3" />
                    관리자
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded bg-[#edf5f0] text-[#2c5340] border border-[#e0ece4]">
                    <UserIcon className="w-3 h-3" />
                    일반회원
                  </span>
                )}
              </div>
              <p className="text-xs text-[#71717a] mt-0.5">
                아이디: @{currentUser.username} • 이메일: {currentUser.email}
              </p>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-[#f4f4f5] hover:bg-[#eaeaea] text-[#71717a] hover:text-[#18181b] border border-[#e8e8ea] transition-colors self-start sm:self-auto"
          >
            로그아웃
          </button>
        </div>

        {/* Activity Counter Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-6">
          <div className="p-4 rounded-xl bg-[#fafafa] border border-[#f0f0f1]">
            <span className="text-xs text-[#71717a]">작성한 글</span>
            <div className="mt-1 text-2xl font-bold text-[#18181b]">
              {myPosts.length} <span className="text-xs font-normal text-[#71717a]">개</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#fafafa] border border-[#f0f0f1]">
            <span className="text-xs text-[#71717a]">작성한 댓글</span>
            <div className="mt-1 text-2xl font-bold text-[#18181b]">
              {myCommentsCount} <span className="text-xs font-normal text-[#71717a]">개</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#fafafa] border border-[#f0f0f1] col-span-2 sm:col-span-1">
            <span className="text-xs text-[#71717a]">가입일</span>
            <div className="mt-1 text-sm font-semibold text-[#18181b]">
              {new Date(currentUser.createdAt).toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {msg && (
        <div
          className={`flex items-center gap-2 p-3.5 text-xs rounded-xl border ${
            msg.isError
              ? 'bg-[#fdf2f2] border-[#fae2e2] text-[#9c3a3a]'
              : 'bg-[#edf5f0] border-[#e0ece4] text-[#2c5340]'
          }`}
        >
          {msg.isError ? (
            <AlertCircle className="w-4 h-4 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          )}
          <span>{msg.text}</span>
        </div>
      )}

      {/* Account Settings Forms */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Nickname Form */}
        <div className="bg-[#ffffff] p-6 rounded-2xl border border-[#ececed] space-y-4">
          <div className="flex items-center gap-2 text-[#18181b] font-bold text-sm">
            <Edit3 className="w-4 h-4 text-[#315643]" />
            <h3>닉네임 변경</h3>
          </div>
          <form onSubmit={handleUpdateNickname} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-[#52525b] mb-1">
                새 닉네임
              </label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#fafafa] border border-[#e4e4e7] rounded-xl text-[#18181b] focus:bg-[#ffffff] focus:outline-none focus:ring-1 focus:ring-[#7ca98e] focus:border-[#7ca98e] transition-colors"
                required
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-[#edf5f0] hover:bg-[#e4ede7] text-[#2c5340] border border-[#e0ece4] transition-colors"
            >
              닉네임 저장
            </button>
          </form>
        </div>

        {/* Password Form */}
        <div className="bg-[#ffffff] p-6 rounded-2xl border border-[#ececed] space-y-4">
          <div className="flex items-center gap-2 text-[#18181b] font-bold text-sm">
            <Key className="w-4 h-4 text-[#315643]" />
            <h3>비밀번호 변경</h3>
          </div>
          <form onSubmit={handleUpdatePassword} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-[#52525b] mb-1">
                새 비밀번호
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="4자 이상 입력"
                className="w-full px-3 py-2 text-xs bg-[#fafafa] border border-[#e4e4e7] rounded-xl text-[#18181b] focus:bg-[#ffffff] focus:outline-none focus:ring-1 focus:ring-[#7ca98e] focus:border-[#7ca98e] transition-colors"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#52525b] mb-1">
                비밀번호 확인
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="동일하게 다시 입력"
                className="w-full px-3 py-2 text-xs bg-[#fafafa] border border-[#e4e4e7] rounded-xl text-[#18181b] focus:bg-[#ffffff] focus:outline-none focus:ring-1 focus:ring-[#7ca98e] focus:border-[#7ca98e] transition-colors"
                required
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-[#edf5f0] hover:bg-[#e4ede7] text-[#2c5340] border border-[#e0ece4] transition-colors"
            >
              비밀번호 변경
            </button>
          </form>
        </div>
      </div>

      {/* My Posts Management List */}
      <div className="bg-[#ffffff] rounded-2xl border border-[#ececed] overflow-hidden shadow-2xs">
        <div className="px-6 py-4 border-b border-[#f4f4f5] bg-[#fafafa] flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold text-[#18181b]">
            <FileText className="w-4 h-4 text-[#315643]" />
            <h3>내가 작성한 글 목록 ({myPosts.length})</h3>
          </div>
          <span className="text-xs text-[#71717a]">
            게시글 수정 및 삭제 관리
          </span>
        </div>

        {myPosts.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#a1a1aa]">
            아직 작성한 게시글이 없습니다.
          </div>
        ) : (
          <div className="divide-y divide-[#f4f4f5]">
            {myPosts.map((post) => (
              <div
                key={post.id}
                className="p-4 sm:px-6 flex items-center justify-between gap-4 hover:bg-[#fafafa] transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-[#edf5f0] text-[#2c5340] border border-[#e0ece4]">
                      {post.category}
                    </span>
                    <span className="text-[11px] text-[#a1a1aa]">
                      {new Date(post.createdAt).toLocaleDateString('ko-KR')}
                    </span>
                  </div>
                  <button
                    onClick={() => onSelectPost(post)}
                    className="text-sm font-semibold text-[#18181b] hover:text-[#315643] text-left truncate block transition-colors"
                  >
                    {post.title}
                  </button>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => onEditPost(post)}
                    className="px-2.5 py-1 text-xs font-medium rounded-lg bg-[#f4f4f5] hover:bg-[#eaeaea] text-[#27272a] border border-[#e8e8ea] transition-colors"
                  >
                    수정
                  </button>
                  <button
                    onClick={() => handleDeletePost(post)}
                    className="p-1 rounded-lg bg-[#fdf2f2] hover:bg-[#fae2e2] text-[#9c3a3a] border border-[#fae2e2] transition-colors"
                    title="삭제"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
