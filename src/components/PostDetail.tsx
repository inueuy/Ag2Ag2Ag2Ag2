import React, { useState, useEffect } from 'react';
import { Post, Comment, User } from '../types';
import { locaDB } from '../services/locadb';
import {
  ArrowLeft,
  X,
  Eye,
  Heart,
  MessageSquare,
  Clock,
  Shield,
  User as UserIcon,
  Trash2,
  Edit3,
  Pin,
  Send,
  CornerDownRight,
  Hash,
} from 'lucide-react';

interface PostDetailProps {
  postId: string;
  isOpenType: boolean; // true = 오픈형(모달/팝업), false = 페이지형
  currentUser: User | null;
  onClose: () => void; // Used when isOpenType is true (닫기)
  onBack: () => void; // Used when isOpenType is false (뒤로가기)
  onEdit: (post: Post) => void;
  onPostDeleted: (postId: string) => void;
  onRequireAuth: () => void;
}

export const PostDetail: React.FC<PostDetailProps> = ({
  postId,
  isOpenType,
  currentUser,
  onClose,
  onBack,
  onEdit,
  onPostDeleted,
  onRequireAuth,
}) => {
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);

  const loadData = () => {
    const currentPost = locaDB.getPostById(postId);
    if (!currentPost) return;

    setPost(currentPost);
    setLikesCount(currentPost.likes);
    if (currentUser) {
      setIsLiked(currentPost.likedUserIds?.includes(currentUser.id) || false);
    } else {
      setIsLiked(false);
    }

    const postComments = locaDB.getComments(postId);
    setComments(postComments);
  };

  useEffect(() => {
    locaDB.incrementViews(postId);
    loadData();

    const handleDataChange = () => {
      loadData();
    };
    window.addEventListener('locadb_changed', handleDataChange);
    return () => {
      window.removeEventListener('locadb_changed', handleDataChange);
    };
  }, [postId, currentUser?.id]);

  if (!post) {
    return (
      <div className="p-8 text-center bg-[#ffffff] rounded-2xl border border-[#ececed]">
        <p className="text-sm text-[#71717a] mb-4">게시글을 찾을 수 없거나 삭제되었습니다.</p>
        {isOpenType ? (
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-[#f4f4f5] text-[#27272a] border border-[#e8e8ea] hover:bg-[#eaeaea]"
          >
            닫기
          </button>
        ) : (
          <button
            onClick={onBack}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-[#f4f4f5] text-[#27272a] border border-[#e8e8ea] hover:bg-[#eaeaea]"
          >
            ← 뒤로가기
          </button>
        )}
      </div>
    );
  }

  const isAuthor = currentUser?.id === post.authorId;
  const isAdmin = currentUser?.role === 'admin';
  const canManage = isAuthor || isAdmin;

  const handleLike = () => {
    if (!currentUser) {
      onRequireAuth();
      return;
    }
    const result = locaDB.toggleLike(post.id, currentUser.id);
    setIsLiked(result.liked);
    setLikesCount(result.totalLikes);
  };

  const handleDelete = () => {
    if (!currentUser) return;
    if (window.confirm('정말로 이 게시글을 삭제하시겠습니까?')) {
      const res = locaDB.deletePost(post.id, currentUser);
      if (res.success) {
        onPostDeleted(post.id);
        if (isOpenType) onClose();
        else onBack();
      } else {
        alert(res.message || '삭제에 실패했습니다.');
      }
    }
  };

  const handleToggleNotice = () => {
    if (!isAdmin || !currentUser) return;
    locaDB.updatePost(post.id, { isNotice: !post.isNotice }, currentUser);
    loadData();
  };

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onRequireAuth();
      return;
    }
    if (!commentText.trim()) return;

    const res = locaDB.createComment({
      postId: post.id,
      author: currentUser,
      content: commentText,
    });

    if (res.success) {
      setCommentText('');
      loadData();
    } else {
      alert(res.message || '댓글 작성에 실패했습니다.');
    }
  };

  const handleDeleteComment = (commentId: string) => {
    if (!currentUser) return;
    if (window.confirm('댓글을 삭제하시겠습니까?')) {
      const res = locaDB.deleteComment(commentId, currentUser);
      if (res.success) {
        loadData();
      } else {
        alert(res.message || '댓글 삭제에 실패했습니다.');
      }
    }
  };

  const formattedDate = new Date(post.createdAt).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const contentComponent = (
    <div className="bg-[#ffffff] rounded-2xl border border-[#ececed] overflow-hidden">
      {/* Top Header / Navigation Bar */}
      <div className="px-6 py-4 border-b border-[#f4f4f5] flex items-center justify-between gap-4 bg-[#fafafa]">
        <div>
          {/* CRITICAL REQUIREMENT:
              게시글이 오픈형일 경우 창을 닫을 때 '닫기' 버튼 추가
              오픈형이 아닐 경우는 '뒤로가기' 버튼으로 */}
          {isOpenType ? (
            <button
              id="post-modal-close-top-btn"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-[#f4f4f5] hover:bg-[#eaeaea] text-[#27272a] border border-[#e8e8ea] transition-colors whitespace-nowrap shrink-0"
              title="창 닫기"
            >
              <X className="w-3.5 h-3.5 text-[#71717a]" />
              닫기
            </button>
          ) : (
            <button
              id="post-page-back-top-btn"
              onClick={onBack}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-[#f4f4f5] hover:bg-[#eaeaea] text-[#27272a] border border-[#e8e8ea] transition-colors whitespace-nowrap shrink-0"
              title="게시판 목록으로 뒤로가기"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[#71717a]" />
              뒤로가기
            </button>
          )}
        </div>

        {/* Action Controls for Author/Admin */}
        <div className="flex items-center gap-2 shrink-0">
          {isAdmin && (
            <button
              onClick={handleToggleNotice}
              title={post.isNotice ? '공지 해제' : '공지로 고정'}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-xl border transition-colors whitespace-nowrap shrink-0 ${
                post.isNotice
                  ? 'bg-[#edf5f0] text-[#2e523f] border-[#e0ece4]'
                  : 'bg-[#f4f4f5] text-[#52525b] border-[#e8e8ea] hover:bg-[#eaeaea]'
              }`}
            >
              <Pin className="w-3 h-3" />
              {post.isNotice ? '공지 고정됨' : '공지 지정'}
            </button>
          )}

          {canManage && (
            <>
              <button
                id="post-edit-btn"
                onClick={() => onEdit(post)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-xl bg-[#f4f4f5] hover:bg-[#eaeaea] text-[#27272a] border border-[#e8e8ea] transition-colors whitespace-nowrap shrink-0"
              >
                <Edit3 className="w-3 h-3 text-[#71717a]" />
                수정
              </button>
              <button
                id="post-delete-btn"
                onClick={handleDelete}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-xl bg-[#fdf2f2] hover:bg-[#fae2e2] text-[#9c3a3a] border border-[#fae2e2] transition-colors whitespace-nowrap shrink-0"
              >
                <Trash2 className="w-3 h-3" />
                삭제
              </button>
            </>
          )}
        </div>
      </div>

      {/* Post Article Body */}
      <article className="p-6 sm:p-8">
        {/* Category & Status */}
        <div className="flex items-center gap-2 mb-3">
          <span className="px-2 py-0.5 text-xs font-semibold rounded-md bg-[#edf5f0] text-[#2c5340] border border-[#e0ece4]">
            {post.category}
          </span>
          {post.isNotice && (
            <span className="px-2 py-0.5 text-xs font-semibold rounded-md bg-[#18181b] text-[#f4f4f5] border border-[#27272a]">
              공지사항
            </span>
          )}
        </div>

        {/* Post Title */}
        <h1 className="text-xl sm:text-2xl font-bold text-[#18181b] tracking-tight mb-4">
          {post.title}
        </h1>

        {/* Meta Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-6 border-b border-[#f4f4f5] text-xs text-[#71717a]">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-[#18181b] font-medium">
              <span className="w-6 h-6 rounded-full bg-[#f4f4f5] border border-[#ececed] flex items-center justify-center text-[#71717a]">
                {post.authorRole === 'admin' ? (
                  <Shield className="w-3 h-3 text-[#315643]" />
                ) : (
                  <UserIcon className="w-3 h-3" />
                )}
              </span>
              <span>{post.authorNickname}</span>
              {post.authorRole === 'admin' && (
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#edf5f0] text-[#2c5340] border border-[#e0ece4]">
                  관리자
                </span>
              )}
            </div>
            <span className="text-[#d4d4d8]">•</span>
            <div className="flex items-center gap-1 text-[#71717a]">
              <Clock className="w-3.5 h-3.5" />
              <span>{formattedDate}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Eye className="w-3.5 h-3.5 text-[#a1a1aa]" />
              <span>조회 {post.views}</span>
            </div>
            <div className="flex items-center gap-1">
              <Heart className="w-3.5 h-3.5 text-[#a1a1aa]" />
              <span>좋아요 {likesCount}</span>
            </div>
            <div className="flex items-center gap-1">
              <MessageSquare className="w-3.5 h-3.5 text-[#a1a1aa]" />
              <span>댓글 {comments.length}</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="py-8 text-[#27272a] text-sm sm:text-base leading-relaxed whitespace-pre-wrap min-h-[140px]">
          {post.content}
        </div>

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pb-6">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-lg bg-[#edf5f0] text-[#2c5340] border border-[#e0ece4]"
              >
                <Hash className="w-3 h-3 text-[#315643]" />
                {tag.replace(/^#/, '')}
              </span>
            ))}
          </div>
        )}

        {/* Interactive Like Button */}
        <div className="pt-6 pb-2 border-t border-[#f4f4f5] flex justify-center">
          <button
            onClick={handleLike}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs sm:text-sm font-semibold border transition-all ${
              isLiked
                ? 'bg-[#edf5f0] text-[#2c5340] border-[#e0ece4] shadow-xs'
                : 'bg-[#f4f4f5] hover:bg-[#eaeaea] text-[#52525b] border-[#e8e8ea]'
            }`}
          >
            <Heart className={`w-4 h-4 ${isLiked ? 'fill-[#315643] text-[#315643]' : ''}`} />
            <span>좋아요 {likesCount}</span>
          </button>
        </div>
      </article>

      {/* Comments Section */}
      <section className="bg-[#fafafa] border-t border-[#f4f4f5] p-6 sm:p-8">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="w-4 h-4 text-[#315643]" />
          <h2 className="text-sm font-bold text-[#18181b]">
            댓글 <span className="text-[#315643] font-mono">{comments.length}</span>
          </h2>
        </div>

        {/* New Comment Input */}
        <form onSubmit={handleCommentSubmit} className="mb-6">
          <div className="p-3 bg-[#ffffff] border border-[#e4e4e7] rounded-xl focus-within:ring-1 focus-within:ring-[#7ca98e] focus-within:border-[#7ca98e] transition-colors">
            <textarea
              rows={2}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder={
                currentUser
                  ? '건전하고 따뜻한 댓글을 남겨주세요.'
                  : '로그인 후 댓글을 작성할 수 있습니다.'
              }
              disabled={!currentUser}
              className="w-full text-sm bg-transparent border-none resize-none focus:outline-none placeholder-[#a1a1aa] text-[#18181b]"
            />
            <div className="flex items-center justify-between pt-2 border-t border-[#f4f4f5]">
              <span className="text-[11px] text-[#a1a1aa]">
                {currentUser ? `${currentUser.nickname} (으)로 작성 중` : '비회원 상태'}
              </span>
              {currentUser ? (
                <button
                  type="submit"
                  disabled={!commentText.trim()}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#edf5f0] hover:bg-[#e4ede7] text-[#2c5340] border border-[#e0ece4] transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap shrink-0"
                >
                  <Send className="w-3 h-3" />
                  댓글 등록
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onRequireAuth}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#f4f4f5] hover:bg-[#eaeaea] text-[#27272a] border border-[#e8e8ea] transition-colors whitespace-nowrap shrink-0"
                >
                  로그인하고 댓글 쓰기
                </button>
              )}
            </div>
          </div>
        </form>

        {/* Comments List */}
        <div className="space-y-3">
          {comments.length === 0 ? (
            <div className="py-6 text-center text-xs text-[#a1a1aa]">
              첫 번째 댓글을 작성해 보세요.
            </div>
          ) : (
            comments.map((comment) => {
              const isCommentAuthor = currentUser?.id === comment.authorId;
              const canDeleteComment = isCommentAuthor || isAdmin;
              const commentDate = new Date(comment.createdAt).toLocaleDateString('ko-KR', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={comment.id}
                  className="p-3.5 rounded-xl bg-[#ffffff] border border-[#ececed] space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs">
                      <CornerDownRight className="w-3 h-3 text-[#a1a1aa]" />
                      <span className="font-semibold text-[#18181b]">
                        {comment.authorNickname}
                      </span>
                      {comment.authorRole === 'admin' && (
                        <span className="text-[10px] px-1 py-0.2 rounded bg-[#edf5f0] text-[#2c5340] border border-[#e0ece4]">
                          관리자
                        </span>
                      )}
                      <span className="text-[11px] text-[#a1a1aa]">• {commentDate}</span>
                    </div>

                    {canDeleteComment && (
                      <button
                        onClick={() => handleDeleteComment(comment.id)}
                        className="text-[11px] text-[#a1a1aa] hover:text-[#9c3a3a] transition-colors whitespace-nowrap shrink-0"
                        title="댓글 삭제"
                      >
                        삭제
                      </button>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm text-[#3f3f46] pl-4.5 whitespace-pre-wrap leading-relaxed">
                    {comment.content}
                  </p>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Bottom Action / Close / Back Bar */}
      <div className="px-6 py-4 border-t border-[#f4f4f5] bg-[#fafafa] flex items-center justify-between">
        <span className="text-xs text-[#a1a1aa]">
          {isOpenType ? '오픈형 모달 모드' : '페이지 이동 모드'}
        </span>

        {/* Explicit Close / Back buttons at bottom as well */}
        {isOpenType ? (
          <button
            id="post-modal-close-bottom-btn"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-[#f4f4f5] hover:bg-[#eaeaea] text-[#27272a] border border-[#e8e8ea] transition-colors whitespace-nowrap shrink-0"
          >
            <X className="w-3.5 h-3.5 text-[#71717a]" />
            닫기
          </button>
        ) : (
          <button
            id="post-page-back-bottom-btn"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-[#f4f4f5] hover:bg-[#eaeaea] text-[#27272a] border border-[#e8e8ea] transition-colors whitespace-nowrap shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#71717a]" />
            목록으로 뒤로가기
          </button>
        )}
      </div>
    </div>
  );

  // If Open Type (modal overlay)
  if (isOpenType) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-[#000000]/45 backdrop-blur-xs overflow-y-auto">
        <div className="w-full max-w-3xl my-auto animate-in fade-in zoom-in-95 duration-150">
          {contentComponent}
        </div>
      </div>
    );
  }

  // If Non-Open Type (page view)
  return <div className="w-full max-w-4xl mx-auto">{contentComponent}</div>;
};
