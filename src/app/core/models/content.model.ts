import type { Timestamp } from 'firebase/firestore';
import type { LocalizedText } from '../../i18n/language.types';

/** Publication lifecycle shared by posts/videos (§36). */
export type ContentStatus = 'draft' | 'published' | 'unpublished' | 'archived';

export type EventStatus = 'draft' | 'published' | 'cancelled' | 'completed';

export type PostType = 'article' | 'reminder' | 'hadith' | 'quran' | 'announcement' | 'event';

/** Editable list — future types are added here, never hard-coded in UI (§15). */
export const POST_TYPES: readonly PostType[] = [
  'article',
  'reminder',
  'hadith',
  'quran',
  'announcement',
  'event',
] as const;

/** Engagement target kind — posts, videos and events share like/bookmark logic. */
export type ItemType = 'post' | 'video' | 'event';

/**
 * `posts/{id}` (§11).
 * Religious source fields (`source`…`hadithNumber`) are preserved verbatim
 * from what the publisher provides (§47) — never fabricated.
 */
export interface Post {
  id: string;
  type: PostType;
  title: LocalizedText;
  description: LocalizedText;
  content: LocalizedText;
  categoryIds: string[];
  status: ContentStatus;
  publishedAt?: Timestamp | null;
  featured: boolean;
  coverImage?: string;
  slug?: string;
  tags: string[];
  relatedVideoIds: string[];
  relatedEventIds: string[];
  /** Source information (§47) — stored exactly as provided. */
  source?: string;
  reference?: string;
  scholar?: string;
  book?: string;
  chapter?: string;
  hadithNumber?: string;
  /** Lowercase prefix tokens built at write time — powers Firestore search (§21). */
  searchKeywords: string[];
  likesCount: number;
  commentsCount: number;
  authorId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** Payload for creating/updating a post (server-owned fields excluded). */
export type PostDraft = Omit<
  Post,
  'id' | 'createdAt' | 'updatedAt' | 'authorId' | 'likesCount' | 'commentsCount' | 'searchKeywords'
>;

/**
 * `videos/{id}` — YouTube-hosted video (§12).
 * Only the video ID + metadata are stored; media never touches Firebase Storage.
 */
export interface Video {
  id: string;
  youtubeId: string;
  youtubeUrl: string;
  title: LocalizedText;
  description: LocalizedText;
  categoryIds: string[];
  thumbnailUrl?: string;
  status: ContentStatus;
  publishedAt?: Timestamp | null;
  featured: boolean;
  relatedPostIds: string[];
  relatedEventIds: string[];
  tags: string[];
  searchKeywords: string[];
  likesCount: number;
  commentsCount: number;
  authorId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type VideoDraft = Omit<
  Video,
  | 'id'
  | 'createdAt'
  | 'updatedAt'
  | 'authorId'
  | 'likesCount'
  | 'commentsCount'
  | 'searchKeywords'
  | 'youtubeId'
  | 'youtubeUrl'
>;

/** `categories/{id}` — dynamic, admin-managed, shared by posts & videos (§15). */
export interface Category {
  id: string;
  name: LocalizedText;
  slug: string;
  description?: LocalizedText;
  icon?: string;
  imageUrl?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type CategoryDraft = Omit<Category, 'id' | 'createdAt' | 'updatedAt'>;

/** `events/{id}` (§17). Historical events are archived, never auto-deleted. */
export interface EventItem {
  id: string;
  title: LocalizedText;
  description: LocalizedText;
  startDate: Timestamp;
  endDate?: Timestamp | null;
  location?: string;
  isOnline: boolean;
  meetingUrl?: string;
  categoryId?: string | null;
  relatedPostIds: string[];
  relatedVideoIds: string[];
  status: EventStatus;
  searchKeywords: string[];
  /** Like counter maintained by transactions (absent until first liked). */
  likesCount?: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}

export type EventDraft = Omit<
  EventItem,
  'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'searchKeywords'
>;

/** `settings/site` — admin-curated platform settings (§22). */
export interface SiteSettings {
  featuredVideoId?: string | null;
  featuredPostIds?: string[];
  homeSections?: Array<{ id: string; enabled: boolean }>;
  updatedAt?: Timestamp;
}
