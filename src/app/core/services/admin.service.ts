import { Injectable, inject } from '@angular/core';
import {
  CollectionReference,
  DocumentReference,
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getCountFromServer,
  limit as limitDocs,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { Observable, firstValueFrom, of } from 'rxjs';
import { Comment, ReportDoc, ReportStatus, SiteSettings, UserProfile } from '../models';
import { FirebaseService } from '../firebase/firebase.service';
import { fromFirestoreQuery, removeUndefined } from '../firebase/firestore.utils';
import { CategoryService } from './category.service';
import { PostService } from './post.service';
import { VideoService } from './video.service';
import { EventService } from './event.service';

/**
 * Admin-only data access: users, moderation and platform settings (§22, §48).
 *
 * Every method here depends on `firestore.rules` granting admin writes via the
 * custom claim — this class contains no privilege logic of its own, it merely
 * calls the operations an admin UI needs.
 */
@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly firebase = inject(FirebaseService);
  private readonly categoryService = inject(CategoryService);
  private readonly postService = inject(PostService);
  private readonly videoService = inject(VideoService);
  private readonly eventService = inject(EventService);

  // ── Users ─────────────────────────────────────────────────────────────────

  listUsers(max = 200): Observable<UserProfile[]> {
    if (!this.firebase.configured) return of([]);
    return fromFirestoreQuery(
      query(
        collection(this.firebase.requireDb(), 'users') as CollectionReference<UserProfile>,
        orderBy('createdAt', 'desc'),
        limitDocs(max),
      ),
    );
  }

  /**
   * Mirror the admin role on the profile document.
   *
   * The authoritative switch is the **custom claim**, which must be set from a
   * trusted context (Firebase console / Admin SDK) — see FIREBASE_SETUP.md.
   * This method keeps the display role in step once that has happened.
   */
  async setProfileRole(uid: string, role: 'user' | 'admin'): Promise<void> {
    const db = this.firebase.requireDb();
    await updateDoc(doc(db, 'users', uid), {
      role,
      updatedAt: Timestamp.now(),
    });
  }

  // ── Comments (moderation) ─────────────────────────────────────────────────

  listComments(max = 200): Observable<Comment[]> {
    if (!this.firebase.configured) return of([]);
    return fromFirestoreQuery(
      query(
        collection(this.firebase.requireDb(), 'comments') as CollectionReference<Comment>,
        orderBy('createdAt', 'desc'),
        limitDocs(max),
      ),
    );
  }

  async setCommentStatus(id: string, status: Comment['status']): Promise<void> {
    const db = this.firebase.requireDb();
    await updateDoc(doc(db, 'comments', id), { status, updatedAt: Timestamp.now() });
  }

  async deleteComment(id: string): Promise<void> {
    const db = this.firebase.requireDb();
    await deleteDoc(doc(db, 'comments', id));
  }

  // ── Reports ───────────────────────────────────────────────────────────────

  listReports(max = 200): Observable<ReportDoc[]> {
    if (!this.firebase.configured) return of([]);
    return fromFirestoreQuery(
      query(
        collection(this.firebase.requireDb(), 'reports') as CollectionReference<ReportDoc>,
        orderBy('createdAt', 'desc'),
        limitDocs(max),
      ),
    );
  }

  async setReportStatus(id: string, status: ReportStatus): Promise<void> {
    const db = this.firebase.requireDb();
    await updateDoc(doc(db, 'reports', id), { status, updatedAt: Timestamp.now() });
  }

  async submitReport(
    reporterId: string,
    targetType: ReportDoc['targetType'],
    targetId: string,
    reason: string,
  ): Promise<string> {
    const db = this.firebase.requireDb();
    const reference: DocumentReference = doc(collection(db, 'reports'));
    await setDoc(reference, {
      reporterId,
      targetType,
      targetId,
      reason,
      status: 'open',
      createdAt: Timestamp.now(),
    });
    return reference.id;
  }

  // ── Platform settings (`settings/site`) ───────────────────────────────────

  /** Live settings document — used by the home page and the admin editor. */
  settings(): Observable<SiteSettings | null> {
    if (!this.firebase.configured) return of(null);
    const reference = doc(
      this.firebase.requireDb(),
      'settings',
      'site',
    ) as DocumentReference<SiteSettings>;
    return new Observable<SiteSettings | null>((subscriber) =>
      onSnapshot(
        reference,
        (snapshot) => subscriber.next(snapshot.exists() ? snapshot.data() : null),
        (error) => subscriber.error(error),
      ),
    );
  }

  async saveSettings(patch: SiteSettings): Promise<void> {
    const db = this.firebase.requireDb();
    await setDoc(
      doc(db, 'settings', 'site'),
      removeUndefined({ ...patch, updatedAt: Timestamp.now() }),
      { merge: true },
    );
  }

  /**
   * Exact document counts via the count aggregate — cheap enough to poll the
   * dashboard without downloading a single document (§22).
   */
  countQuery(name: 'posts' | 'videos' | 'users' | 'events' | 'comments' | 'categories' | 'reports'): Observable<number> {
    if (!this.firebase.configured) return of(0);
    return new Observable<number>((subscriber) => {
      void getCountFromServer(collection(this.firebase.requireDb(), name))
        .then((snapshot) => {
          subscriber.next(snapshot.data().count);
          subscriber.complete();
        })
        .catch((error: unknown) => subscriber.error(error));
      return () => undefined;
    });
  }

  /**
   * Seed authentic Islamic sample categories, posts, YouTube videos, and events (§46).
   * Populates Firestore with demo content for testing and initial platform setup.
   */
  async seedSampleData(authorId: string): Promise<{
    categories: number;
    posts: number;
    videos: number;
    events: number;
  }> {
    const { SAMPLE_CATEGORIES, SAMPLE_POSTS, SAMPLE_VIDEOS, SAMPLE_EVENTS } =
      await import('../data/sample-data');

    // 1. Categories
    const categoryMap = new Map<string, string>();
    for (const item of SAMPLE_CATEGORIES) {
      const existing = await firstValueFrom(this.categoryService.bySlug(item.slug));
      if (existing.length > 0) {
        categoryMap.set(item.key, existing[0].id);
      } else {
        const id = await this.categoryService.create({
          name: item.name,
          slug: item.slug,
          description: item.description,
          icon: item.icon,
          isActive: item.isActive,
          sortOrder: item.sortOrder,
        });
        categoryMap.set(item.key, id);
      }
    }

    // 2. Posts
    let createdPosts = 0;
    const postIds: string[] = [];
    for (const item of SAMPLE_POSTS) {
      const catId = categoryMap.get(item.categoryKey);
      const postDraft = {
        ...item,
        categoryIds: catId ? [catId] : [],
      };
      const postId = await this.postService.create(authorId, postDraft);
      postIds.push(postId);
      createdPosts++;
    }

    // 3. Videos
    let createdVideos = 0;
    const videoIds: string[] = [];
    for (const item of SAMPLE_VIDEOS) {
      const catId = categoryMap.get(item.categoryKey);
      const videoDraft = {
        ...item,
        categoryIds: catId ? [catId] : [],
      };
      const videoId = await this.videoService.create(authorId, videoDraft);
      videoIds.push(videoId);
      createdVideos++;
    }

    // 4. Events
    let createdEvents = 0;
    for (const item of SAMPLE_EVENTS) {
      const catId = categoryMap.get(item.categoryKey);
      const eventDraft = {
        ...item,
        categoryId: catId ?? null,
      };
      await this.eventService.create(authorId, eventDraft);
      createdEvents++;
    }

    // 5. Update site settings with featured video & posts
    if (videoIds.length > 0 || postIds.length > 0) {
      await this.saveSettings({
        featuredVideoId: videoIds[0] ?? null,
        featuredPostIds: postIds.slice(0, 3),
      });
    }

    return {
      categories: categoryMap.size,
      posts: createdPosts,
      videos: createdVideos,
      events: createdEvents,
    };
  }
}
