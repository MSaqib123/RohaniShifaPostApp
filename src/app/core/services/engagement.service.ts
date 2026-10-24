import { Injectable, inject } from '@angular/core';
import {
  CollectionReference,
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit as limitDocs,
  orderBy,
  query,
  runTransaction,
  setDoc,
  where,
} from 'firebase/firestore';
import { Observable, catchError, distinctUntilChanged, from, map, of } from 'rxjs';
import { BookmarkDoc, Comment, CommentDraft, LikeDoc, ItemType, engagementId } from '../models';
import { FirebaseService } from '../firebase/firebase.service';
import { fromFirestoreQuery, removeUndefined } from '../firebase/firestore.utils';

/**
 * Likes, bookmarks and comments (§19).
 *
 * The like/bookmark document id is `{uid}_{itemType}_{itemId}` — duplicates
 * become structurally impossible and Firestore rules reduce to "you may only
 * write a doc whose id starts with your uid". Counters on the parent document
 * are maintained here with plain transactions (no Cloud Functions needed).
 */
@Injectable({ providedIn: 'root' })
export class EngagementService {
  private readonly firebase = inject(FirebaseService);

  // ── Likes ─────────────────────────────────────────────────────────────────

  /** Live "is this liked by `uid`" flag for one item. */
  likedBy(uid: string, itemType: ItemType, itemId: string): Observable<boolean> {
    if (!uid) return of(false);
    const localLikes = this.getLocalLikes(uid);
    const hasLocal = localLikes.some((l) => l.itemType === itemType && l.itemId === itemId);
    if (!this.firebase.configured) return of(hasLocal);

    const reference = doc(this.firebase.requireDb(), 'likes', engagementId(uid, itemType, itemId));
    return from(getDoc(reference)).pipe(
      map((snapshot) => snapshot.exists() || hasLocal),
      distinctUntilChanged(),
      catchError(() => of(hasLocal)),
    );
  }

  /** All liked item docs by `uid` across all item types (for profile display). */
  allLikedDocs(uid: string): Observable<LikeDoc[]> {
    if (!uid) return of([]);
    const local = this.getLocalLikes(uid);
    if (!this.firebase.configured) return of(local);

    return fromFirestoreQuery(
      query(
        this.ref('likes') as CollectionReference<LikeDoc>,
        where('userId', '==', uid),
        limitDocs(300),
      ),
    ).pipe(
      map((docs) => {
        const mapById = new Map<string, LikeDoc>();
        // Add remote docs first
        for (const d of docs) mapById.set(d.itemId, d);
        // Merge local docs that might not have synced yet
        for (const l of local) {
          if (!mapById.has(l.itemId)) mapById.set(l.itemId, l);
        }
        return Array.from(mapById.values());
      }),
      catchError((err) => {
        console.error('Error in allLikedDocs:', err);
        return of(local);
      }),
    );
  }

  /** All item ids of `type` liked by `uid` (profile pages, filters). */
  likedIds(uid: string, itemType: ItemType): Observable<string[]> {
    return this.allLikedDocs(uid).pipe(
      map((docs) => docs.filter((d) => d.itemType === itemType).map((d) => d.itemId)),
    );
  }

  /** Returns the new liked state so the UI can flip without a refetch. */
  async toggleLike(uid: string, itemType: ItemType, itemId: string): Promise<boolean> {
    const id = engagementId(uid, itemType, itemId);
    let nextState = false;

    if (this.firebase.configured) {
      try {
        const db = this.firebase.requireDb();
        const reference = doc(db, 'likes', id);
        const snapshot = await getDoc(reference);

        if (snapshot.exists()) {
          await deleteDoc(reference);
          await this.adjustCount(itemType, itemId, 'likesCount', -1);
          nextState = false;
        } else {
          await setDoc(reference, {
            id,
            userId: uid,
            itemType,
            itemId,
            createdAt: Timestamp.now(),
          } satisfies LikeDoc);
          await this.adjustCount(itemType, itemId, 'likesCount', 1);
          nextState = true;
        }
      } catch (err) {
        console.warn('Firestore toggleLike failed, falling back to local storage', err);
        const local = this.getLocalLikes(uid);
        const idx = local.findIndex((l) => l.itemType === itemType && l.itemId === itemId);
        nextState = idx === -1;
      }
    } else {
      const local = this.getLocalLikes(uid);
      const idx = local.findIndex((l) => l.itemType === itemType && l.itemId === itemId);
      nextState = idx === -1;
    }

    // Mirror to local cache
    const currentLocal = this.getLocalLikes(uid);
    if (nextState) {
      if (!currentLocal.some((l) => l.itemType === itemType && l.itemId === itemId)) {
        currentLocal.unshift({
          id,
          userId: uid,
          itemType,
          itemId,
          createdAt: Timestamp.now(),
        });
      }
    } else {
      const filtered = currentLocal.filter((l) => !(l.itemType === itemType && l.itemId === itemId));
      this.setLocalLikes(uid, filtered);
      return false;
    }
    this.setLocalLikes(uid, currentLocal);
    return nextState;
  }

  // ── Bookmarks ─────────────────────────────────────────────────────────────

  bookmarkedBy(uid: string, itemType: ItemType, itemId: string): Observable<boolean> {
    if (!uid) return of(false);
    const local = this.getLocalBookmarks(uid);
    const hasLocal = local.some((b) => b.itemType === itemType && b.itemId === itemId);
    if (!this.firebase.configured) return of(hasLocal);

    const reference = doc(
      this.firebase.requireDb(),
      'bookmarks',
      engagementId(uid, itemType, itemId),
    );
    return from(getDoc(reference)).pipe(
      map((snapshot) => snapshot.exists() || hasLocal),
      distinctUntilChanged(),
      catchError(() => of(hasLocal)),
    );
  }

  /** All bookmark docs by `uid` across all item types (for profile display). */
  allBookmarkDocs(uid: string): Observable<BookmarkDoc[]> {
    if (!uid) return of([]);
    const local = this.getLocalBookmarks(uid);
    if (!this.firebase.configured) return of(local);

    return fromFirestoreQuery(
      query(
        this.ref('bookmarks') as CollectionReference<BookmarkDoc>,
        where('userId', '==', uid),
        limitDocs(300),
      ),
    ).pipe(
      map((docs) => {
        const mapById = new Map<string, BookmarkDoc>();
        for (const d of docs) mapById.set(d.itemId, d);
        for (const b of local) {
          if (!mapById.has(b.itemId)) mapById.set(b.itemId, b);
        }
        return Array.from(mapById.values());
      }),
      catchError((err) => {
        console.error('Error in allBookmarkDocs:', err);
        return of(local);
      }),
    );
  }

  bookmarkedIds(uid: string, itemType: ItemType): Observable<string[]> {
    return this.allBookmarkDocs(uid).pipe(
      map((docs) => docs.filter((b) => b.itemType === itemType).map((b) => b.itemId)),
    );
  }

  async toggleBookmark(uid: string, itemType: ItemType, itemId: string): Promise<boolean> {
    const id = engagementId(uid, itemType, itemId);
    let nextState = false;

    if (this.firebase.configured) {
      try {
        const db = this.firebase.requireDb();
        const reference = doc(db, 'bookmarks', id);
        const snapshot = await getDoc(reference);

        if (snapshot.exists()) {
          await deleteDoc(reference);
          nextState = false;
        } else {
          await setDoc(reference, {
            id,
            userId: uid,
            itemType,
            itemId,
            createdAt: Timestamp.now(),
          } satisfies BookmarkDoc);
          nextState = true;
        }
      } catch (err) {
        console.warn('Firestore toggleBookmark failed, using local fallback', err);
        const local = this.getLocalBookmarks(uid);
        const idx = local.findIndex((b) => b.itemType === itemType && b.itemId === itemId);
        nextState = idx === -1;
      }
    } else {
      const local = this.getLocalBookmarks(uid);
      const idx = local.findIndex((b) => b.itemType === itemType && b.itemId === itemId);
      nextState = idx === -1;
    }

    // Mirror to local cache
    const currentLocal = this.getLocalBookmarks(uid);
    if (nextState) {
      if (!currentLocal.some((b) => b.itemType === itemType && b.itemId === itemId)) {
        currentLocal.unshift({
          id,
          userId: uid,
          itemType,
          itemId,
          createdAt: Timestamp.now(),
        });
      }
    } else {
      const filtered = currentLocal.filter((b) => !(b.itemType === itemType && b.itemId === itemId));
      this.setLocalBookmarks(uid, filtered);
      return false;
    }
    this.setLocalBookmarks(uid, currentLocal);
    return nextState;
  }

  // ── Comments ──────────────────────────────────────────────────────────────

  /** Visible comments for an item, oldest first. */
  listComments(itemType: 'post' | 'video', itemId: string): Observable<Comment[]> {
    if (!this.firebase.configured) return of([]);
    return fromFirestoreQuery(
      query(
        this.ref('comments') as CollectionReference<Comment>,
        where('itemId', '==', itemId),
        limitDocs(200),
      ),
    ).pipe(
      map((comments) => {
        const filtered = comments.filter((c) => c.itemType === itemType && c.status === 'visible');
        filtered.sort((a, b) => {
          const timeA = a.createdAt?.toMillis() ?? 0;
          const timeB = b.createdAt?.toMillis() ?? 0;
          return timeA - timeB;
        });
        return filtered;
      }),
      catchError((err) => {
        console.error('Error in listComments:', err);
        return of([]);
      }),
    );
  }

  /** Comments written by one user (profile view). */
  listByUser(uid: string): Observable<Comment[]> {
    if (!uid) return of([]);
    const local = this.getLocalComments(uid);
    if (!this.firebase.configured) return of(local);

    return fromFirestoreQuery(
      query(
        this.ref('comments') as CollectionReference<Comment>,
        where('userId', '==', uid),
        limitDocs(100),
      ),
    ).pipe(
      map((comments) => {
        const mapById = new Map<string, Comment>();
        for (const c of comments) mapById.set(c.id, c);
        for (const l of local) {
          if (!mapById.has(l.id)) mapById.set(l.id, l);
        }
        const sorted = Array.from(mapById.values());
        sorted.sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0));
        return sorted;
      }),
      catchError((err) => {
        console.error('Error in listByUser comments:', err);
        return of(local);
      }),
    );
  }

  async addComment(draft: CommentDraft): Promise<string> {
    const id = 'cmt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const now = Timestamp.now();
    const newComment: Comment = {
      ...draft,
      id,
      status: 'visible',
      createdAt: now,
      updatedAt: now,
    };

    if (this.firebase.configured) {
      try {
        const db = this.firebase.requireDb();
        const reference = doc(collection(db, 'comments'));
        newComment.id = reference.id;
        await setDoc(reference, removeUndefined(newComment as unknown as Record<string, unknown>));
        await this.adjustCount(draft.itemType, draft.itemId, 'commentsCount', 1);
      } catch (err) {
        console.warn('Firestore addComment failed, saving locally', err);
      }
    }

    // Mirror to user's local comments
    if (draft.userId) {
      const local = this.getLocalComments(draft.userId);
      local.unshift(newComment);
      this.setLocalComments(draft.userId, local);
    }

    return newComment.id;
  }

  async removeComment(id: string, itemType: 'post' | 'video', itemId: string, userId?: string): Promise<void> {
    if (this.firebase.configured) {
      try {
        const db = this.firebase.requireDb();
        await deleteDoc(doc(db, 'comments', id));
        await this.adjustCount(itemType, itemId, 'commentsCount', -1);
      } catch (err) {
        console.warn('Firestore removeComment failed', err);
      }
    }

    if (userId) {
      const local = this.getLocalComments(userId);
      this.setLocalComments(userId, local.filter((c) => c.id !== id));
    }
  }

  // ── Local Storage Helpers ─────────────────────────────────────────────────

  private getLocalLikes(uid: string): LikeDoc[] {
    try {
      const raw = localStorage.getItem(`rohani_likes_${uid}`);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return parsed.map((item: any) => ({
        ...item,
        createdAt: item.createdAt ? new Timestamp(item.createdAt.seconds || 0, item.createdAt.nanoseconds || 0) : Timestamp.now(),
      }));
    } catch {
      return [];
    }
  }

  private setLocalLikes(uid: string, likes: LikeDoc[]): void {
    try {
      localStorage.setItem(`rohani_likes_${uid}`, JSON.stringify(likes));
    } catch {}
  }

  private getLocalBookmarks(uid: string): BookmarkDoc[] {
    try {
      const raw = localStorage.getItem(`rohani_bookmarks_${uid}`);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return parsed.map((item: any) => ({
        ...item,
        createdAt: item.createdAt ? new Timestamp(item.createdAt.seconds || 0, item.createdAt.nanoseconds || 0) : Timestamp.now(),
      }));
    } catch {
      return [];
    }
  }

  private setLocalBookmarks(uid: string, bookmarks: BookmarkDoc[]): void {
    try {
      localStorage.setItem(`rohani_bookmarks_${uid}`, JSON.stringify(bookmarks));
    } catch {}
  }

  private getLocalComments(uid: string): Comment[] {
    try {
      const raw = localStorage.getItem(`rohani_comments_${uid}`);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return parsed.map((item: any) => ({
        ...item,
        createdAt: item.createdAt ? new Timestamp(item.createdAt.seconds || 0, item.createdAt.nanoseconds || 0) : Timestamp.now(),
        updatedAt: item.updatedAt ? new Timestamp(item.updatedAt.seconds || 0, item.updatedAt.nanoseconds || 0) : Timestamp.now(),
      }));
    } catch {
      return [];
    }
  }

  private setLocalComments(uid: string, comments: Comment[]): void {
    try {
      localStorage.setItem(`rohani_comments_${uid}`, JSON.stringify(comments));
    } catch {}
  }

  // ── Internals ─────────────────────────────────────────────────────────────

  private ref(name: 'likes' | 'bookmarks' | 'comments'): CollectionReference {
    return collection(this.firebase.requireDb(), name);
  }

  /**
   * Keep the parent's counter in step with a ±1 change.
   *
   * A transaction re-reads the document, so concurrent likes cannot clobber
   * each other, and the count can never drop below zero (§36).
   */
  private async adjustCount(
    itemType: ItemType,
    itemId: string,
    field: 'likesCount' | 'commentsCount',
    delta: number,
  ): Promise<void> {
    const collectionName =
      itemType === 'post' ? 'posts' : itemType === 'video' ? 'videos' : 'events';
    const db = this.firebase.requireDb();
    await runTransaction(db, async (transaction) => {
      const reference = doc(db, collectionName, itemId);
      const snapshot = await transaction.get(reference);
      if (!snapshot.exists()) return;
      const current = Number(snapshot.data()[field] ?? 0);
      transaction.update(reference, { [field]: Math.max(0, current + delta) });
    });
  }
}
