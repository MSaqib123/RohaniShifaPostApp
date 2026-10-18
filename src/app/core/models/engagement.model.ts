import type { Timestamp } from 'firebase/firestore';
import type { ItemType } from './content.model';

/** Moderation state for comments (§48). */
export type CommentStatus = 'visible' | 'hidden' | 'flagged';

/** `comments/{id}` — attachable to posts and videos (§19). */
export interface Comment {
  id: string;
  itemType: 'post' | 'video';
  itemId: string;
  userId: string;
  displayName: string;
  content: string;
  /** Reserved for threaded comments in a future release. */
  parentCommentId?: string | null;
  status: CommentStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type CommentDraft = Omit<Comment, 'id' | 'createdAt' | 'updatedAt' | 'status'>;

export const MAX_COMMENT_LENGTH = 1000;

/**
 * `likes/{uid}_{itemType}_{itemId}` — document ID encodes ownership, which is
 * what makes duplicate likes impossible and rules trivial to express (§19).
 */
export interface LikeDoc {
  id: string;
  userId: string;
  itemType: ItemType;
  itemId: string;
  createdAt: Timestamp;
}

/** `bookmarks/{uid}_{itemType}_{itemId}` — same ownership-by-ID pattern. */
export interface BookmarkDoc {
  id: string;
  userId: string;
  itemType: ItemType;
  itemId: string;
  createdAt: Timestamp;
}

/** Builds the deterministic like/bookmark document ID. */
export function engagementId(userId: string, itemType: ItemType, itemId: string): string {
  return `${userId}_${itemType}_${itemId}`;
}

export type ReportStatus = 'open' | 'reviewed' | 'dismissed';

/** `reports/{id}` — user-submitted moderation reports (§48). */
export interface ReportDoc {
  id: string;
  reporterId: string;
  targetType: ItemType | 'comment';
  targetId: string;
  reason: string;
  status: ReportStatus;
  createdAt: Timestamp;
}
