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
    if (!this.firebase.configured || !uid) return of(false);
    const reference = doc(this.firebase.requireDb(), 'likes', engagementId(uid, itemType, itemId));
    return from(getDoc(reference)).pipe(
      map((snapshot) => snapshot.exists()),
      distinctUntilChanged(),
    );
  }

  /** All item ids of `type` liked by `uid` (profile pages, filters). */
  likedIds(uid: string, itemType: ItemType): Observable<string[]> {
    if (!this.firebase.configured || !uid) return of([]);
    return fromFirestoreQuery(
      query(
        this.ref('likes') as CollectionReference<LikeDoc>,
        where('userId', '==', uid),
        limitDocs(300),
      ),
    ).pipe(
      map((docs) => docs.filter((doc) => doc.itemType === itemType).map((doc) => doc.itemId)),
      catchError((err) => {
        console.error('Error in likedIds:', err);
        return of([]);
      }),
    );
  }

  /** Returns the new liked state so the UI can flip without a refetch. */
  async toggleLike(uid: string, itemType: ItemType, itemId: string): Promise<boolean> {
    const db = this.firebase.requireDb();
    const id = engagementId(uid, itemType, itemId);
    const reference = doc(db, 'likes', id);
    const snapshot = await getDoc(reference);

    if (snapshot.exists()) {
      await deleteDoc(reference);
      await this.adjustCount(itemType, itemId, 'likesCount', -1);
      return false;
    }

    await setDoc(reference, {
      id,
      userId: uid,
      itemType,
      itemId,
      createdAt: Timestamp.now(),
    } satisfies LikeDoc);
    await this.adjustCount(itemType, itemId, 'likesCount', 1);
    return true;
  }

  // ── Bookmarks ─────────────────────────────────────────────────────────────

  bookmarkedBy(uid: string, itemType: ItemType, itemId: string): Observable<boolean> {
    if (!this.firebase.configured || !uid) return of(false);
    const reference = doc(
      this.firebase.requireDb(),
      'bookmarks',
      engagementId(uid, itemType, itemId),
    );
    return from(getDoc(reference)).pipe(
      map((snapshot) => snapshot.exists()),
      distinctUntilChanged(),
    );
  }

  bookmarkedIds(uid: string, itemType: ItemType): Observable<string[]> {
    if (!this.firebase.configured || !uid) return of([]);
    return fromFirestoreQuery(
      query(
        this.ref('bookmarks') as CollectionReference<BookmarkDoc>,
        where('userId', '==', uid),
        limitDocs(300),
      ),
    ).pipe(
      map((docs) => docs.filter((doc) => doc.itemType === itemType).map((doc) => doc.itemId)),
      catchError((err) => {
        console.error('Error in bookmarkedIds:', err);
        return of([]);
      }),
    );
  }

  async toggleBookmark(uid: string, itemType: ItemType, itemId: string): Promise<boolean> {
    const db = this.firebase.requireDb();
    const id = engagementId(uid, itemType, itemId);
    const reference = doc(db, 'bookmarks', id);
    const snapshot = await getDoc(reference);

    if (snapshot.exists()) {
      await deleteDoc(reference);
      return false;
    }

    await setDoc(reference, {
      id,
      userId: uid,
      itemType,
      itemId,
      createdAt: Timestamp.now(),
    } satisfies BookmarkDoc);
    return true;
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
    if (!this.firebase.configured) return of([]);
    return fromFirestoreQuery(
      query(
        this.ref('comments') as CollectionReference<Comment>,
        where('userId', '==', uid),
        limitDocs(100),
      ),
    ).pipe(
      map((comments) => {
        const sorted = [...comments];
        sorted.sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0));
        return sorted;
      }),
      catchError((err) => {
        console.error('Error in listByUser comments:', err);
        return of([]);
      }),
    );
  }

  async addComment(draft: CommentDraft): Promise<string> {
    const db = this.firebase.requireDb();
    const reference = doc(collection(db, 'comments'));
    const now = Timestamp.now();
    await setDoc(
      reference,
      removeUndefined({
        ...draft,
        status: 'visible',
        createdAt: now,
        updatedAt: now,
      }),
    );
    await this.adjustCount(draft.itemType, draft.itemId, 'commentsCount', 1);
    return reference.id;
  }

  async removeComment(id: string, itemType: 'post' | 'video', itemId: string): Promise<void> {
    const db = this.firebase.requireDb();
    await deleteDoc(doc(db, 'comments', id));
    await this.adjustCount(itemType, itemId, 'commentsCount', -1);
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
