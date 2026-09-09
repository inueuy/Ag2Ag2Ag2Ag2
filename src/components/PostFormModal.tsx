import React, { useState, useEffect } from 'react';
import { Post, PostCategory, User } from '../types';
import { locaDB } from '../services/locadb';
import { X, PenLine, AlertCircle, Pin, Hash, Plus } from 'lucide-react';

interface PostFormModalProps {
  isOpen: boolean;
  editPost?: Post | null;
  currentUser: User | null;
  onClose: () => void;
  onSuccess: (post: Post) => void;
  onRequireAuth: () => void;
}

export const PostFormModal: React.FC<PostFormModalProps> = ({
  isOpen,
  editPost,
  currentUser,
  onClose,
  onSuccess,
  onRequireAuth,
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<PostCategory>('자유');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isNotice, setIsNotice] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    if (editPost) {
      setTitle(editPost.title);
      setContent(editPost.content);
      setCategory(editPost.category);
      setTags(editPost.tags || []);
      setIsNotice(Boolean(editPost.isNotice));
    } else {
      setTitle('');
      setContent('');
      setCategory('자유');
      setTags(['#유은']);
      setIsNotice(false);
    }
    setTagInput('');
    setError(null);
  }, [editPost, isOpen]);

  if (!isOpen) return null;

  const handleAddTag = (rawTag: string) => {
    const trimmed = rawTag.trim();
    if (!trimmed) return;
    const clean = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
    if (!tags.includes(clean)) {
      setTags([...tags, clean]);
    }
    setTagInput('');
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddTag(tagInput);
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!currentUser) {
      onRequireAuth();
      return;
    }

    if (!title.trim()) {
      setError('제목을 입력해 주세요.');
      return;
    }

    if (!content.trim()) {
      setError('내용을 입력해 주세요.');
      return;
    }

    // Process any lingering tag input
    let finalTags = [...tags];
    if (tagInput.trim()) {
      const extra = tagInput.trim().startsWith('#') ? tagInput.trim() : `#${tagInput.trim()}`;
      if (!finalTags.includes(extra)) {
        finalTags.push(extra);
      }
    }

    if (editPost) {
      const res = locaDB.updatePost(
        editPost.id,
        {
          title,
          content,
          tags: finalTags,
          category,
          isNotice: isAdmin ? isNotice : editPost.isNotice,
        },
        currentUser
      );

      if (res.success && res.post) {
        onSuccess(res.post);
        onClose();
      } else {
        setError(res.message || '게시글 수정에 실패했습니다.');
      }
    } else {
      const res = locaDB.createPost({
        title,
        content,
        tags: finalTags,
        category,
        isNotice: isAdmin ? isNotice : false,
        author: currentUser,
      });

      if (res.success && res.post) {
        onSuccess(res.post);
        onClose();
      } else {
        setError(res.message || '게시글 등록에 실패했습니다.');
      }
    }
  };

  const categories: PostCategory[] = isAdmin
    ? ['공지', '자유', '질문', '정보']
    : ['자유', '질문', '정보'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#000000]/40 backdrop-blur-xs">
      <div className="bg-[#ffffff] border border-[#ececed] rounded-2xl w-full max-w-2xl overflow-hidden shadow-xl animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#f4f4f5] shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-[#edf5f0] border border-[#e2ece5] flex items-center justify-center text-[#315643]">
              <PenLine className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-base font-bold text-[#18181b]">
                {editPost ? '게시글 수정' : '새 글 작성'}
              </h3>
              <p className="text-xs text-[#71717a]">
                유은이 팬카페에 응원과 소중한 이야기를 남겨보세요.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#a1a1aa] hover:text-[#18181b] hover:bg-[#f4f4f5] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="flex items-center gap-2 p-3 text-xs rounded-xl bg-[#fdf2f2] border border-[#fae2e2] text-[#9c3a3a]">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Category selection */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#52525b]">
              카테고리 선택
            </label>
            <div className="flex flex-wrap items-center gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                    category === cat
                      ? 'bg-[#edf5f0] text-[#2c5340] border-[#e0ece4]'
                      : 'bg-[#f4f4f5] text-[#71717a] border-[#e8e8ea] hover:bg-[#eaeaea] hover:text-[#18181b]'
                  }`}
                >
                  {cat}
                </button>
              ))}

              {isAdmin && (
                <label className="ml-auto inline-flex items-center gap-1.5 text-xs text-[#52525b] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isNotice}
                    onChange={(e) => setIsNotice(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-[#d4d4d8] text-[#315643] focus:ring-[#7ca98e]"
                  />
                  <Pin className="w-3 h-3 text-[#315643]" />
                  <span>공지사항으로 상단 고정</span>
                </label>
              )}
            </div>
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#52525b]">
              제목
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="게시글 제목을 입력하세요"
              maxLength={120}
              className="w-full px-3.5 py-2.5 text-sm bg-[#fafafa] border border-[#e4e4e7] rounded-xl text-[#18181b] placeholder-[#a1a1aa] focus:bg-[#ffffff] focus:outline-none focus:ring-1 focus:ring-[#7ca98e] focus:border-[#7ca98e] transition-colors"
              required
            />
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#52525b]">
              태그 (Tag)
            </label>
            <div className="flex flex-wrap items-center gap-1.5 p-2 bg-[#fafafa] border border-[#e4e4e7] rounded-xl focus-within:bg-[#ffffff] focus-within:ring-1 focus-within:ring-[#7ca98e] focus-within:border-[#7ca98e] transition-colors">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-[#edf5f0] text-[#2c5340] border border-[#e0ece4]"
                >
                  <Hash className="w-3 h-3 text-[#315643]" />
                  {tag.replace(/^#/, '')}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="ml-0.5 hover:text-[#9c3a3a] focus:outline-none"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              <div className="flex items-center gap-1 flex-1 min-w-[140px]">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  placeholder="태그 입력 후 Enter 또는 추가"
                  className="w-full bg-transparent px-2 py-1 text-xs text-[#18181b] placeholder-[#a1a1aa] focus:outline-none"
                />
                {tagInput.trim() && (
                  <button
                    type="button"
                    onClick={() => handleAddTag(tagInput)}
                    className="inline-flex items-center gap-0.5 px-2 py-1 text-[11px] font-medium rounded-md bg-[#edf5f0] text-[#2c5340] border border-[#e0ece4] shrink-0"
                  >
                    <Plus className="w-3 h-3" />
                    추가
                  </button>
                )}
              </div>
            </div>
            <p className="text-[11px] text-[#a1a1aa]">
              예: #유은, #팬미팅, #응원, #포토카드 (엔터 또는 쉼표로 추가할 수 있습니다)
            </p>
          </div>

          {/* Content */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-semibold text-[#52525b]">
                본문 내용
              </label>
              <span className="text-[11px] text-[#a1a1aa]">
                {content.length}자
              </span>
            </div>
            <textarea
              rows={7}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="유은이를 향한 응원이나 공유하고 싶은 이야기를 자유롭게 작성해 주세요."
              className="w-full p-3.5 text-sm bg-[#fafafa] border border-[#e4e4e7] rounded-xl text-[#18181b] placeholder-[#a1a1aa] focus:bg-[#ffffff] focus:outline-none focus:ring-1 focus:ring-[#7ca98e] focus:border-[#7ca98e] transition-colors resize-y leading-relaxed"
              required
            />
          </div>

          {/* Modal Footer with tone-on-tone buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#f4f4f5]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-[#f4f4f5] hover:bg-[#eaeaea] text-[#27272a] border border-[#e8e8ea] transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold rounded-xl bg-[#edf5f0] hover:bg-[#e4ede7] text-[#2c5340] border border-[#e0ece4] transition-colors"
            >
              {editPost ? '수정 완료' : '게시글 등록'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
