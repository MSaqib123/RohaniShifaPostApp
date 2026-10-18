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
import { Video, VideoDraft } from '../models';
import { FirebaseService } from '../firebase/firebase.service';
import {
  buildSearchKeywords,
  fromFirestoreDoc,
  fromFirestoreQuery,
  removeUndefined,
} from '../firebase/firestore.utils';
import { parseYouTubeId, youtubeThumbnailUrl, youtubeWatchUrl } from './youtube';

/** Options accepted by the public video queries. */
export interface VideoListOptions {
  categoryId?: string | null;
  featured?: boolean | null;
  max?: number;
}

function flattenLocalized(value: LocalizedText | string | undefined): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return [value.en, value.ur, value.ar].filter(Boolean).join(' ');
}

/**
 * `videos/{id}` access layer (§12, §39).
 *
 * Only the YouTube id + metadata are stored — media never enters Firebase
 * Storage. Every write re-parses the source URL, so an edited/corrupted link
 * can never produce a broken embed.
 */
@Injectable({ providedIn: 'root' })
export class VideoService {
  private readonly firebase = inject(FirebaseService);

  // ── Public reads ──────────────────────────────────────────────────────────

  listPublished(options: VideoListOptions = {}): Observable<Video[]> {
    if (!this.firebase.configured) return of([]);
    return fromFirestoreQuery(
      query(this.videosRef(), where('status', '==', 'published'), limitDocs(options.max ? options.max * 5 : 200)),
    ).pipe(
      map((videos) => {
        let result = videos;
        if (options.categoryId) {
          result = result.filter((v) => v.categoryIds?.includes(options.categoryId!));
        }
        if (options.featured !== null && options.featured !== undefined) {
          result = result.filter((v) => v.featured === options.featured);
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
        console.error('Error in listPublished videos:', err);
        return of([]);
      }),
    );
  }

  get(id: string): Observable<Video | null> {
    if (!this.firebase.configured) return of(null);
    return fromFirestoreDoc(doc(this.videosRef(), id));
  }

  byIds(ids: string[]): Observable<Video[]> {
    if (!this.firebase.configured || ids.length === 0) return of([]);
    const chunks: string[][] = [];
    for (let i = 0; i < ids.length; i += 30) chunks.push(ids.slice(i, i + 30));

    return new Observable<Video[]>((subscriber) => {
      let cancelled = false;
      Promise.all(
        chunks.map((chunk) => getDocs(query(this.videosRef(), where(documentId(), 'in', chunk)))),
      )
        .then((snapshots) => {
          if (cancelled) return;
          const results = new Map<string, Video>();
          for (const snapshot of snapshots) {
            for (const item of snapshot.docs) {
              results.set(item.id, { ...item.data(), id: item.id } as Video);
            }
          }
          subscriber.next(
            ids.map((id) => results.get(id)).filter((video): video is Video => !!video),
          );
          subscriber.complete();
        })
        .catch((error) => subscriber.error(error));
      return () => {
        cancelled = true;
      };
    });
  }

  // ── Admin reads ───────────────────────────────────────────────────────────

  listAll(max = 100): Observable<Video[]> {
    if (!this.firebase.configured) return of([]);
    return fromFirestoreQuery(
      query(this.videosRef(), orderBy('updatedAt', 'desc'), limitDocs(max)),
    );
  }

  // ── Admin writes ──────────────────────────────────────────────────────────

  /**
   * Create a video from a draft whose `youtubeUrl` the admin pasted.
   * Throws when the URL cannot be parsed — invalid links never persist (§61).
   */
  async create(authorId: string, draft: VideoDraft & { youtubeUrl: string }): Promise<string> {
    const youtubeId = parseYouTubeId(draft.youtubeUrl);
    if (!youtubeId) throw new Error('admin.videoForm.invalidUrl');

    const db = this.firebase.requireDb();
    const reference: DocumentReference = doc(collection(db, 'videos'));
    const now = Timestamp.now();
    const payload: Record<string, unknown> = removeUndefined({
      ...draft,
      youtubeId,
      youtubeUrl: youtubeWatchUrl(youtubeId),
      thumbnailUrl: draft.thumbnailUrl || youtubeThumbnailUrl(youtubeId),
      publishedAt:
        draft.status === 'published' ? (draft.publishedAt ?? now) : (draft.publishedAt ?? null),
      searchKeywords: buildSearchKeywords(...this.searchable(draft), youtubeId),
      likesCount: 0,
      commentsCount: 0,
      authorId,
      createdAt: now,
      updatedAt: now,
    });
    await setDoc(reference, payload);
    return reference.id;
  }

  async update(id: string, draft: VideoDraft & { youtubeUrl: string }): Promise<void> {
    const youtubeId = parseYouTubeId(draft.youtubeUrl);
    if (!youtubeId) throw new Error('admin.videoForm.invalidUrl');

    const db = this.firebase.requireDb();
    await setDoc(
      doc(db, 'videos', id),
      removeUndefined({
        ...draft,
        youtubeId,
        youtubeUrl: youtubeWatchUrl(youtubeId),
        thumbnailUrl: draft.thumbnailUrl || youtubeThumbnailUrl(youtubeId),
        searchKeywords: buildSearchKeywords(...this.searchable(draft), youtubeId),
        updatedAt: Timestamp.now(),
      }),
      { merge: true },
    );
  }

  /** Delete a video and its engagement traces (confirmed admin action only). */
  async remove(id: string): Promise<void> {
    const db = this.firebase.requireDb();
    const batch = writeBatch(db);
    batch.delete(doc(db, 'videos', id));

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

  private videosRef(): CollectionReference<Video> {
    return collection(this.firebase.requireDb(), 'videos') as CollectionReference<Video>;
  }

  private searchable(draft: VideoDraft): string[] {
    return [
      flattenLocalized(draft.title),
      flattenLocalized(draft.description),
      ...(draft.tags ?? []),
    ];
  }
}
