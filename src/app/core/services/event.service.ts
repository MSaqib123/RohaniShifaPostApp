import { Injectable, inject } from '@angular/core';
import {
  CollectionReference,
  DocumentReference,
  Timestamp,
  collection,
  doc,
  getDocs,
  limit as limitDocs,
  orderBy,
  query,
  setDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { Observable, of, catchError, map } from 'rxjs';
import { EventDraft, EventItem, EventStatus } from '../models';
import { FirebaseService } from '../firebase/firebase.service';
import {
  buildSearchKeywords,
  fromFirestoreDoc,
  fromFirestoreQuery,
  removeUndefined,
} from '../firebase/firestore.utils';

/**
 * `events/{id}` access layer (§17).
 *
 * Historic integrity rule: past events are **archived, never deleted**
 * automatically. `remove()` exists only for drafts/erroneous entries and is
 * always an explicit, confirmed admin action.
 */
@Injectable({ providedIn: 'root' })
export class EventService {
  private readonly firebase = inject(FirebaseService);

  // ── Public reads ──────────────────────────────────────────────────────────

  /** Published events from `now` onward, soonest first. */
  listUpcoming(max = 50): Observable<EventItem[]> {
    if (!this.firebase.configured) return of([]);
    return fromFirestoreQuery(
      query(this.eventsRef(), where('status', '==', 'published'), limitDocs(100)),
    ).pipe(
      map((events) => {
        const now = Date.now();
        const result = events.filter((e) => (e.startDate?.toMillis() ?? 0) >= now);
        result.sort((a, b) => (a.startDate?.toMillis() ?? 0) - (b.startDate?.toMillis() ?? 0));
        return result.slice(0, max);
      }),
      catchError((err) => {
        console.error('Error in listUpcoming events:', err);
        return of([]);
      }),
    );
  }

  /** Published events that already happened, most recent first (archive). */
  listPast(max = 50): Observable<EventItem[]> {
    if (!this.firebase.configured) return of([]);
    return fromFirestoreQuery(
      query(
        this.eventsRef(),
        where('status', 'in', ['published', 'completed', 'cancelled']),
        limitDocs(100),
      ),
    ).pipe(
      map((events) => {
        const now = Date.now();
        const result = events.filter((e) => (e.startDate?.toMillis() ?? 0) < now);
        result.sort((a, b) => (b.startDate?.toMillis() ?? 0) - (a.startDate?.toMillis() ?? 0));
        return result.slice(0, max);
      }),
      catchError((err) => {
        console.error('Error in listPast events:', err);
        return of([]);
      }),
    );
  }

  /** Published events in a window — powers the month calendar (§24). */
  listBetween(from: Date, to: Date, max = 100): Observable<EventItem[]> {
    if (!this.firebase.configured) return of([]);
    const fromTime = from.getTime();
    const toTime = to.getTime();
    return fromFirestoreQuery(
      query(
        this.eventsRef(),
        where('status', 'in', ['published', 'completed', 'cancelled']),
        limitDocs(200),
      ),
    ).pipe(
      map((events) => {
        const result = events.filter((e) => {
          const t = e.startDate?.toMillis() ?? 0;
          return t >= fromTime && t < toTime;
        });
        result.sort((a, b) => (a.startDate?.toMillis() ?? 0) - (b.startDate?.toMillis() ?? 0));
        return result.slice(0, max);
      }),
      catchError((err) => {
        console.error('Error in listBetween events:', err);
        return of([]);
      }),
    );
  }

  get(id: string): Observable<EventItem | null> {
    if (!this.firebase.configured) return of(null);
    return fromFirestoreDoc(doc(this.eventsRef(), id));
  }

  // ── Admin reads ───────────────────────────────────────────────────────────

  /** All events (including drafts) — the archive view, newest first. */
  listAll(max = 100): Observable<EventItem[]> {
    if (!this.firebase.configured) return of([]);
    return fromFirestoreQuery(
      query(this.eventsRef(), orderBy('startDate', 'desc'), limitDocs(max)),
    );
  }

  // ── Admin writes ──────────────────────────────────────────────────────────

  async create(createdBy: string, draft: EventDraft): Promise<string> {
    const db = this.firebase.requireDb();
    const reference: DocumentReference = doc(collection(db, 'events'));
    const now = Timestamp.now();
    await setDoc(
      reference,
      removeUndefined({
        ...draft,
        searchKeywords: buildSearchKeywords(
          this.flatten(draft.title),
          this.flatten(draft.description),
          draft.location ?? '',
        ),
        createdAt: now,
        updatedAt: now,
        createdBy,
      }),
    );
    return reference.id;
  }

  async update(id: string, draft: EventDraft): Promise<void> {
    const db = this.firebase.requireDb();
    await setDoc(
      doc(db, 'events', id),
      removeUndefined({
        ...draft,
        searchKeywords: buildSearchKeywords(
          this.flatten(draft.title),
          this.flatten(draft.description),
          draft.location ?? '',
        ),
        updatedAt: Timestamp.now(),
      }),
      { merge: true },
    );
  }

  /** Complete an event without deleting it — the archive keeps the record. */
  async markStatus(id: string, status: EventStatus): Promise<void> {
    const db = this.firebase.requireDb();
    await setDoc(doc(db, 'events', id), { status, updatedAt: Timestamp.now() }, { merge: true });
  }

  /**
   * Hard delete — reserved for drafts or entries created by mistake.
   * Past *published* events must be cancelled/completed instead (§17).
   */
  async remove(id: string): Promise<void> {
    const db = this.firebase.requireDb();
    const batch = writeBatch(db);
    batch.delete(doc(db, 'events', id));

    for (const name of ['likes', 'bookmarks'] as const) {
      const snapshot = await getDocs(
        query(collection(db, name), where('itemId', '==', id), limitDocs(400)),
      );
      snapshot.docs.forEach((item) => batch.delete(item.ref));
    }
    await batch.commit();
  }

  // ── Internals ─────────────────────────────────────────────────────────────

  private eventsRef(): CollectionReference<EventItem> {
    return collection(this.firebase.requireDb(), 'events') as CollectionReference<EventItem>;
  }

  private flatten(value: { en?: string; ur?: string; ar?: string } | string | undefined): string {
    if (!value) return '';
    if (typeof value === 'string') return value;
    return [value.en, value.ur, value.ar].filter(Boolean).join(' ');
  }
}
