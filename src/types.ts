export type Role = 'admin' | 'user';

export type UserStatus = 'active' | 'suspended';

export interface User {
  id: string;
  username: string;
  password?: string;
  nickname: string;
  email: string;
  role: Role;
  status: UserStatus;
  createdAt: string;
}

export type PostCategory = '공지' | '자유' | '질문' | '정보';

export interface Post {
  id: string;
  title: string;
  content: string;
  tags?: string[];
  authorId: string;
  authorNickname: string;
  authorRole: Role;
  category: PostCategory;
  views: number;
  likes: number;
  likedUserIds: string[];
  isNotice: boolean;
  createdAt: string;
  updatedAt: string;
  commentsCount: number;
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  authorNickname: string;
  authorRole: Role;
  content: string;
  createdAt: string;
}

export type ViewMode = 'modal' | 'page'; // 오픈형(모달) vs 일반(페이지형)

export type PostFilter = 'all' | 'my';
export type SortOption = 'latest' | 'views' | 'likes' | 'comments';

export type PdfTaskType = 'image_to_pdf' | 'merge_pdf' | 'split_pdf';

export interface PdfRecord {
  id: string;
  title: string;
  taskType: PdfTaskType;
  pageCount: number;
  fileSizeBytes: number;
  sourceCount: number;
  authorId?: string;
  authorNickname?: string;
  createdAt: string;
  notes?: string;
  downloadUrl?: string;
}

export interface PdfBookmark {
  title: string;
  pageNumber: number; // 1-based
  pageIndex: number;  // 0-based
}

