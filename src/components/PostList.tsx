import React, { useState } from 'react';
import { Post, PostCategory, PostFilter, SortOption, User, ViewMode } from '../types';
import {
  Search,
  PenSquare,
  Pin,
  Eye,
  Heart,
  MessageSquare,
  Shield,
  Layers,
  FileText,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Hash,
  X,
} from 'lucide-react';

interface PostListProps {
  posts: Post[];
  currentUser: User | null;
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  postFilter: PostFilter;
  onChangePostFilter: (filter: PostFilter) => void;
  viewMode: ViewMode;
  onToggleViewMode: (mode: ViewMode) => void;
  onSelectPost: (post: Post) => void;
  onOpenWriteModal: () => void;
}

export const PostList: React.FC<PostListProps> = ({
  posts,
  currentUser,
  selectedCategory,
  onSelectCategory,
  postFilter,
  onChangePostFilter,
  viewMode,
  onToggleViewMode,
  onSelectPost,
  onOpenWriteModal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('latest');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const categories: (string | PostCategory)[] = ['전체', '공지', '자유', '질문', '정보'];

  // Filter posts
  const filteredPosts = posts.filter((post) => {
    // Category filter
    if (selectedCategory !== '전체' && post.category !== selectedCategory) {
      return false;
    }

    // My posts filter
    if (postFilter === 'my') {
      if (!currentUser || post.authorId !== currentUser.id) {
        return false;
      }
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = post.title.toLowerCase().includes(q);
      const matchContent = post.content.toLowerCase().includes(q);
      const matchAuthor = post.authorNickname.toLowerCase().includes(q);
      const matchTag = post.tags?.some((t) => t.toLowerCase().includes(q));
      if (!matchTitle && !matchContent && !matchAuthor && !matchTag) {
        return false;
      }
    }

    return true;
  });

  // Sort
  const sortedPosts = [...filteredPosts].sort((a, b) => {
    // Keep notices at the top in 'all' view
    if (a.isNotice && !b.isNotice) return -1;
    if (!a.isNotice && b.isNotice) return 1;

    switch (sortBy) {
      case 'views':
        return b.views - a.views;
      case 'likes':
        return b.likes - a.likes;
      case 'comments':
        return b.commentsCount - a.commentsCount;
      case 'latest':
      default:
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sortedPosts.length / itemsPerPage));
  const paginatedPosts = sortedPosts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-4">
      {/* Category Pills & View Mode Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[#ffffff] p-4 rounded-2xl border border-[#ececed]">
        {/* Categories */}
        <div className="flex flex-wrap items-center gap-1.5">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => {
                  onSelectCategory(cat);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all ${
                  isSelected
                    ? 'bg-[#edf5f0] text-[#2c5340] border-[#e0ece4]'
                    : 'bg-[#f4f4f5] text-[#52525b] border-[#e8e8ea] hover:bg-[#eaeaea] hover:text-[#18181b]'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* View Mode and My Filter Controls */}
        <div className="flex flex-wrap items-center gap-2 self-stretch sm:self-auto justify-between sm:justify-end">
          {currentUser && (
            <div className="flex items-center p-0.5 bg-[#f4f4f5] border border-[#ececed] rounded-xl text-xs">
              <button
                onClick={() => {
                  onChangePostFilter('all');
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded-lg transition-all font-medium border ${
                  postFilter === 'all'
                    ? 'bg-[#ffffff] text-[#18181b] shadow-2xs border-[#f0f0f1]'
                    : 'bg-transparent text-[#71717a] border-transparent hover:text-[#18181b]'
                }`}
              >
                전체 글
              </button>
              <button
                onClick={() => {
                  onChangePostFilter('my');
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded-lg transition-all font-medium border ${
                  postFilter === 'my'
                    ? 'bg-[#edf5f0] text-[#2c5340] shadow-2xs border-[#e0ece4]'
                    : 'bg-transparent text-[#71717a] border-transparent hover:text-[#18181b]'
                }`}
              >
                내 글 관리
              </button>
            </div>
          )}

          {/* View Mode Pill Switcher */}
          <div className="flex items-center p-0.5 bg-[#f4f4f5] border border-[#ececed] rounded-xl text-xs">
            <button
              onClick={() => onToggleViewMode('modal')}
              title="오픈형 모달로 글 열기 (닫기 버튼 포함)"
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all font-medium border ${
                viewMode === 'modal'
                  ? 'bg-[#edf5f0] text-[#2c5340] shadow-2xs border-[#e0ece4]'
                  : 'bg-transparent text-[#71717a] border-transparent hover:text-[#18181b]'
              }`}
            >
              <Layers className="w-3 h-3" />
              오픈형 (닫기)
            </button>
            <button
              onClick={() => onToggleViewMode('page')}
              title="페이지 이동으로 글 열기 (뒤로가기 버튼 포함)"
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all font-medium border ${
                viewMode === 'page'
                  ? 'bg-[#edf5f0] text-[#2c5340] shadow-2xs border-[#e0ece4]'
                  : 'bg-transparent text-[#71717a] border-transparent hover:text-[#18181b]'
              }`}
            >
              <FileText className="w-3 h-3" />
              페이지형 (뒤로)
            </button>
          </div>
        </div>
      </div>

      {/* Search & Sort & Count Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-1">
        <div className="text-xs text-[#71717a]">
          총 <strong className="text-[#18181b]">{sortedPosts.length}</strong>개의 게시글
          {postFilter === 'my' && (
            <span className="ml-1.5 px-1.5 py-0.5 text-[10px] rounded bg-[#edf5f0] text-[#2c5340] border border-[#e0ece4]">
              내가 쓴 글 보기 중
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Search Box */}
          <div className="relative flex-1 sm:w-64">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="제목, 내용, 작성자, #태그 검색"
              className="w-full pl-8 pr-7 py-1.5 text-xs bg-[#ffffff] border border-[#e4e4e7] rounded-xl text-[#18181b] placeholder-[#a1a1aa] focus:outline-none focus:ring-1 focus:ring-[#7ca98e] focus:border-[#7ca98e] transition-colors"
            />
            <Search className="w-3.5 h-3.5 text-[#a1a1aa] absolute left-2.5 top-2 pointer-events-none" />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-2 text-[#a1a1aa] hover:text-[#18181b]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-1 bg-[#ffffff] border border-[#e4e4e7] rounded-xl px-2 py-1 text-xs text-[#52525b]">
            <SlidersHorizontal className="w-3 h-3 text-[#a1a1aa]" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="bg-transparent text-xs text-[#27272a] focus:outline-none cursor-pointer"
            >
              <option value="latest">최신순</option>
              <option value="views">조회수순</option>
              <option value="likes">좋아요순</option>
              <option value="comments">댓글많은순</option>
            </select>
          </div>
        </div>
      </div>

      {/* Posts Table / Card List */}
      <div className="bg-[#ffffff] rounded-2xl border border-[#ececed] overflow-hidden shadow-2xs">
        {paginatedPosts.length === 0 ? (
          <div className="py-16 px-4 text-center">
            <p className="text-sm font-medium text-[#52525b] mb-1">
              게시글이 없습니다.
            </p>
            <p className="text-xs text-[#a1a1aa] mb-4">
              {searchQuery
                ? '검색 조건과 일치하는 게시글이 없습니다.'
                : '가장 먼저 새로운 글을 작성해 보세요.'}
            </p>
            <button
              onClick={onOpenWriteModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-[#edf5f0] hover:bg-[#e4ede7] text-[#2c5340] border border-[#e0ece4] transition-colors"
            >
              <PenSquare className="w-3.5 h-3.5" />
              첫 글 작성하기
            </button>
          </div>
        ) : (
          <div className="divide-y divide-[#f4f4f5]">
            {paginatedPosts.map((post) => {
              const isNotice = post.isNotice;
              const isOwnPost = currentUser?.id === post.authorId;
              const dateStr = new Date(post.createdAt).toLocaleDateString('ko-KR', {
                year: '2-digit',
                month: '2-digit',
                day: '2-digit',
              });

              return (
                <div
                  key={post.id}
                  onClick={() => onSelectPost(post)}
                  className={`group p-4 sm:px-6 sm:py-4.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 cursor-pointer transition-colors ${
                    isNotice
                      ? 'bg-[#fcfdfc] hover:bg-[#edf5f0]/50'
                      : 'hover:bg-[#fafafa]'
                  }`}
                >
                  {/* Left: Category & Title & Meta */}
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="flex items-center gap-2 mb-1.5">
                      {isNotice ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-md bg-[#18181b] text-white border border-[#27272a]">
                          <Pin className="w-2.5 h-2.5" />
                          공지
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-[11px] font-semibold rounded-md bg-[#edf5f0] text-[#2c5340] border border-[#e0ece4]">
                          {post.category}
                        </span>
                      )}

                      {isOwnPost && (
                        <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-[#f4f4f5] text-[#52525b] border border-[#e8e8ea]">
                          내 글
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm sm:text-base font-semibold text-[#18181b] group-hover:text-[#315643] transition-colors line-clamp-1 flex items-center gap-2">
                      <span>{post.title}</span>
                      {post.commentsCount > 0 && (
                        <span className="inline-flex items-center text-xs font-mono font-medium text-[#315643]">
                          [{post.commentsCount}]
                        </span>
                      )}
                    </h3>

                    {/* Preview snippet for mobile/card view */}
                    <p className="mt-1 text-xs text-[#71717a] line-clamp-1">
                      {post.content}
                    </p>

                    {/* Tag list */}
                    {post.tags && post.tags.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        {post.tags.map((tag) => (
                          <span
                            key={tag}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSearchQuery(tag);
                              setCurrentPage(1);
                            }}
                            className="inline-flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-medium rounded-md bg-[#edf5f0] hover:bg-[#e2ece5] text-[#2c5340] border border-[#e0ece4] transition-colors"
                          >
                            <Hash className="w-2.5 h-2.5 opacity-60" />
                            {tag.replace(/^#/, '')}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Right: Author & Stats & Date */}
                  <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-4 shrink-0 text-xs text-[#71717a] border-t sm:border-t-0 pt-2 sm:pt-0 border-[#f4f4f5]">
                    {/* Author */}
                    <div className="flex items-center gap-1.5 min-w-[80px]">
                      <span className="font-medium text-[#27272a] truncate max-w-[90px]">
                        {post.authorNickname}
                      </span>
                      {post.authorRole === 'admin' && (
                        <span title="관리자">
                          <Shield className="w-3 h-3 text-[#315643]" />
                        </span>
                      )}
                    </div>

                    {/* Date */}
                    <span className="text-[11px] text-[#a1a1aa] min-w-[65px] text-right">
                      {dateStr}
                    </span>

                    {/* Views & Likes */}
                    <div className="flex items-center gap-2.5 text-[11px] min-w-[75px] justify-end">
                      <span className="flex items-center gap-0.5 text-[#71717a]">
                        <Eye className="w-3 h-3 text-[#a1a1aa]" />
                        {post.views}
                      </span>
                      <span className="flex items-center gap-0.5 text-[#71717a]">
                        <Heart className="w-3 h-3 text-[#a1a1aa]" />
                        {post.likes}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-[#f4f4f5] bg-[#fafafa] flex items-center justify-center gap-1 text-xs">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg bg-[#ffffff] text-[#52525b] border border-[#e8e8ea] hover:bg-[#f4f4f5] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-8 h-8 rounded-lg font-medium transition-all border ${
                  currentPage === page
                    ? 'bg-[#edf5f0] text-[#2c5340] border-[#e0ece4]'
                    : 'bg-[#ffffff] text-[#52525b] border-[#e8e8ea] hover:bg-[#f4f4f5]'
                }`}
              >
                {page}
              </button>
            ))}

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg bg-[#ffffff] text-[#52525b] border border-[#e8e8ea] hover:bg-[#f4f4f5] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
