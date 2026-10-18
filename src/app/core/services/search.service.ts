import { Injectable, inject } from '@angular/core';
import {
  Query,
  collection,
  getDocs,
  limit as limitDocs,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { Observable, from, map, of } from 'rxjs';
import { LocalizedText } from '../../i18n/language.types';
import { Category } from '../models';
import { FirebaseService } from '../firebase/firebase.service';

/** A search hit — `kind` drives the result list icon, label and route. */
export type SearchKind = 'post' | 'video' | 'event' | 'category';

export interface SearchResult {
  kind: SearchKind;
  id: string;
  title: string;
  subtitle: string;
  route: string;
}

export interface SearchResponse {
  query: string;
  results: SearchResult[];
}

/** How many hits any single collection may contribute. */
const PER_COLLECTION = 25;

/** Collections searchable by keyword, with the field they order results by. */
const KEYWORD_COLLECTIONS = [
  { name: 'posts', orderField: 'publishedAt' },
  { name: 'videos', orderField: 'publishedAt' },
  { name: 'events', orderField: 'startDate' },
] as const;

/**
 * Firestore-honest search (§21).
 *
 * Firestore has no full-text index, so posts/videos/events store lowercase
 * **prefix tokens** in `searchKeywords`, regenerated on every write. We ask
 * Firestore for documents containing the first typed prefix and keep only
 * those containing *every* typed prefix — AND semantics, no phantom ranking,
 * and nothing readable that `firestore.rules` would not already allow.
 *
 * Swap point: replacing this service with a hosted search provider touches
 * only this file; `SearchResponse` stays identical.
 */
@Injectable({ providedIn: 'root' })
export class SearchService {
  private readonly firebase = inject(FirebaseService);

  /** Search all content kinds. Empty/whitespace input short-circuits. */
  search(rawQuery: string): Observable<SearchResponse> {
    const terms = tokenize(rawQuery);
    if (!this.firebase.configured || terms.length === 0) {
      return of({ query: rawQuery.trim(), results: [] });
    }

    return from(
      Promise.all([
        ...KEYWORD_COLLECTIONS.map((entry) => this.queryKeywordCollection(entry, terms)),
        this.queryCategories(terms),
      ]),
    ).pipe(
      map((groups) => ({
        query: rawQuery.trim(),
        results: groups.flat(),
      })),
    );
  }

  // ── Internals ─────────────────────────────────────────────────────────────

  /**
   * Query one keyword-searchable collection.
   *
   * Firestore matches documents containing *any* prefix (index-friendly
   * `array-contains`); the `every` filter then enforces AND semantics in the
   * client, which is the honest cost of prefix search without a text engine.
   */
  private async queryKeywordCollection(
    entry: (typeof KEYWORD_COLLECTIONS)[number],
    terms: string[],
  ): Promise<SearchResult[]> {
    const db = this.firebase.requireDb();
    const statusFilter =
      entry.name === 'events'
        ? // Events stay readable after they happen — the archive is public (§17).
          where('status', 'in', ['published', 'completed', 'cancelled'])
        : where('status', '==', 'published');

    const base: Query = query(
      collection(db, entry.name),
      statusFilter,
      where('searchKeywords', 'array-contains', terms[0]),
      orderBy(entry.orderField, 'desc'),
      limitDocs(PER_COLLECTION * 3),
    );

    const snapshot = await getDocs(base);
    const matched = snapshot.docs
      .map(
        (docSnap) =>
          ({
            ...docSnap.data(),
            id: docSnap.id,
          }) as {
            id: string;
            searchKeywords: string[];
            title: LocalizedText;
            description: LocalizedText;
          },
      )
      .filter((doc) => terms.every((term) => doc.searchKeywords.includes(term)));

    return matched.slice(0, PER_COLLECTION).map((doc) => ({
      kind: entry.name as SearchKind,
      id: doc.id,
      title: pickLocalized(doc.title),
      subtitle: pickLocalized(doc.description),
      route: `/${entry.name}/${doc.id}`,
    }));
  }

  /** Categories carry no status/keywords — filter active entries in memory. */
  private async queryCategories(terms: string[]): Promise<SearchResult[]> {
    const db = this.firebase.requireDb();
    const snapshot = await getDocs(
      query(collection(db, 'categories'), where('isActive', '==', true), limitDocs(100)),
    );

    const matched = snapshot.docs
      .map((docSnap) => ({ ...docSnap.data(), id: docSnap.id }) as Category)
      .filter((category) =>
        terms.every((term) =>
          [category.name?.en, category.name?.ur, category.name?.ar, category.slug]
            .filter((value): value is string => !!value)
            .some((value) => value.toLowerCase().includes(term)),
        ),
      );

    return matched.slice(0, PER_COLLECTION).map((category) => ({
      kind: 'category' as const,
      id: category.id,
      title: pickLocalized(category.name),
      subtitle: '',
      route: `/categories/${category.slug}`,
    }));
  }
}

/**
 * Lowercase, strip punctuation and split into terms (§21).
 *
 * Each term keeps its typed length because `searchKeywords` stores every
 * prefix from 3 characters up to 12 plus the full word — so "rama" matches
 * "ramadan" while staying as precise as the user was. Terms longer than 12
 * are trimmed to the longest stored prefix. Unicode property escapes keep
 * Urdu and Arabic words intact.
 */
export function tokenize(value: string): string[] {
  const cleaned = value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .trim();
  if (!cleaned) return [];

  return Array.from(new Set(cleaned.split(/\s+/).filter(Boolean)))
    .map((word) => (word.length > 12 ? word.slice(0, 12) : word))
    .slice(0, 8);
}

function pickLocalized(value: LocalizedText | string | undefined): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value.en ?? value.ur ?? value.ar ?? '';
}
