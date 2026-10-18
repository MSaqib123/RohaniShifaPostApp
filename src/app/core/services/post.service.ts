import { Injectable, inject } from '@angular/core';
import {
  CollectionReference,
  DocumentReference,
  Timestamp,
  collection,
  doc,
  documentId,
  getDocs,
  limit as limitDocs,
  orderBy,
  query,
  setDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { Observable, of, catchError, map } from 'rxjs';
import { LocalizedText } from '../../i18n/language.types';
import { Post, PostDraft, PostType } from '../models';
import { FirebaseService } from '../firebase/firebase.service';
import {
  buildSearchKeywords,
  fromFirestoreDoc,
  fromFirestoreQuery,
  removeUndefined,
} from '../firebase/firestore.utils';

/** Options accepted by the public post queries. */
export interface PostListOptions {
  type?: PostType | null;
  categoryId?: string | null;
  featured?: boolean | null;
  max?: number;
}

/** Flatten a multilingual field so search indexes every language (§21). */
function flattenLocalized(value: LocalizedText | string | undefined): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return [value.en, value.ur, value.ar].filter(Boolean).join(' ');
}

/**
 * `posts/{id}` access layer (§39).
 *
 * Public reads are limited to `status == 'published'`; everything else is an
 * admin operation whose authorisation lives in `firestore.rules` (§26 — the
 * client never decides who may write). Every write regenerates
 * `searchKeywords`, so search stays consistent without reindexing jobs (§21).
 */
@Injectable({ providedIn: 'root' })
export class PostService {
  private readonly firebase = inject(FirebaseService);

  // ── Public reads ──────────────────────────────────────────────────────────

  /** Published posts, newest first, optionally narrowed by type/category. */
  listPublished(options: PostListOptions = {}): Observable<Post[]> {
    if (!this.firebase.configured) return of([]);
    return fromFirestoreQuery(
      query(
        this.postsRef(),
        where('status', '==', 'published'),
        limitDocs(options.max ? options.max * 5 : 200),
      ),
    ).pipe(
      map((posts) => {
        let result = posts;
        if (options.type) {
          result = result.filter((p) => p.type === options.type);
        }
        if (options.categoryId) {
          result = result.filter((p) => p.categoryIds?.includes(options.categoryId!));
        }
        if (options.featured !== null && options.featured !== undefined) {
          result = result.filter((p) => p.featured === options.featured);
        }
        result.sort((a, b) => {
          const timeA = a.publishedAt?.toMillis() ?? a.createdAt?.toMillis() ?? 0;
          const timeB = b.publishedAt?.toMillis() ?? b.createdAt?.toMillis() ?? 0;
          return timeB - timeA;
        });
        if (options.max) {
          result = result.slice(0, options.max);
        }
        return result;
      }),
      catchError((err) => {
        console.error('Error in listPublished posts:', err);
        return of([]);
      }),
    );
  }

  /** One post by id (live — status changes appear immediately). */
  get(id: string): Observable<Post | null> {
    if (!this.firebase.configured) return of(null);
    return fromFirestoreDoc(doc(this.postsRef(), id));
  }

  /** Resolve related ids to posts, preserving the given id order. */
  byIds(ids: string[]): Observable<Post[]> {
    if (!this.firebase.configured || ids.length === 0) return of([]);
    // Firestore `in` accepts 30 values per query, so large sets are chunked.
    const chunks: string[][] = [];
    for (let i = 0; i < ids.length; i += 30) chunks.push(ids.slice(i, i + 30));

    return new Observable<Post[]>((subscriber) => {
      let cancelled = false;
      Promise.all(
        chunks.map((chunk) => getDocs(query(this.postsRef(), where(documentId(), 'in', chunk)))),
      )
        .then((snapshots) => {
          if (cancelled) return;
          const results = new Map<string, Post>();
          for (const snapshot of snapshots) {
            for (const item of snapshot.docs) {
              results.set(item.id, { ...item.data(), id: item.id } as Post);
            }
          }
          subscriber.next(ids.map((id) => results.get(id)).filter((post): post is Post => !!post));
          subscriber.complete();
        })
        .catch((error) => subscriber.error(error));
      return () => {
        cancelled = true;
      };
    });
  }

  // ── Admin reads ───────────────────────────────────────────────────────────

  /** Every post regardless of status (admin list; rules enforce who may ask). */
  listAll(max = 100): Observable<Post[]> {
    if (!this.firebase.configured) return of([]);
    return fromFirestoreQuery(query(this.postsRef(), orderBy('updatedAt', 'desc'), limitDocs(max)));
  }

  // ── Admin writes ──────────────────────────────────────────────────────────

  /** Create a post; id, timestamps and server-owned counters are set here (§36). */
  async create(authorId: string, draft: PostDraft): Promise<string> {
    const db = this.firebase.requireDb();
    const reference: DocumentReference = doc(collection(db, 'posts'));
    const now = Timestamp.now();
    await setDoc(
      reference,
      removeUndefined({
        ...draft,
        // `publishedAt` is what public queries order by — keep it in sync with
        // status at creation time; later status edits go through `update()`.
        publishedAt:
          draft.status === 'published' ? (draft.publishedAt ?? now) : (draft.publishedAt ?? null),
        searchKeywords: buildSearchKeywords(...this.searchable(draft)),
        likesCount: 0,
        commentsCount: 0,
        authorId,
        createdAt: now,
        updatedAt: now,
      }),
    );
    return reference.id;
  }

  async update(id: string, draft: PostDraft): Promise<void> {
    const db = this.firebase.requireDb();
    await setDoc(
      doc(db, 'posts', id),
      removeUndefined({
        ...draft,
        searchKeywords: buildSearchKeywords(...this.searchable(draft)),
        updatedAt: Timestamp.now(),
      }),
      { merge: true },
    );
  }

  /**
   * Delete a post together with its engagement traces so no orphaned
   * likes/comments remain. Content removal is always an explicit, confirmed
   * admin action — never automatic (§17, §61).
   */
  async remove(id: string): Promise<void> {
    const db = this.firebase.requireDb();
    const batch = writeBatch(db);
    batch.delete(doc(db, 'posts', id));

    for (const name of ['likes', 'bookmarks'] as const) {
      const snapshot = await getDocs(
        query(collection(db, name), where('itemId', '==', id), limitDocs(400)),
      );
      snapshot.docs.forEach((item) => batch.delete(item.ref));
    }

    const comments = await getDocs(
      query(collection(db, 'comments'), where('itemId', '==', id), limitDocs(400)),
    );
    comments.docs.forEach((item) => batch.delete(item.ref));

    await batch.commit();
  }

  // ── Internals ─────────────────────────────────────────────────────────────

  private postsRef(): CollectionReference<Post> {
    return collection(this.firebase.requireDb(), 'posts') as CollectionReference<Post>;
  }

  /** Every localised string worth indexing — all languages, all fields. */
  private searchable(draft: PostDraft): string[] {
    return [
      flattenLocalized(draft.title),
      flattenLocalized(draft.description),
      flattenLocalized(draft.content),
      ...(draft.tags ?? []),
    ];
  }
}
