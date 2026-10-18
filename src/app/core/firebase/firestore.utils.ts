import type {
  DocumentReference,
  DocumentSnapshot,
  Query,
  QueryDocumentSnapshot,
} from 'firebase/firestore';
import { onSnapshot } from 'firebase/firestore';
import { Observable } from 'rxjs';

/**
 * Firestore ⇄ RxJS helpers shared by every service (§39).
 * Components never touch the SDK directly — services do, through these.
 */

/** Attach a document id to its data (models always include `id`). */
export function withId<T>(snapshot: DocumentSnapshot<T> | QueryDocumentSnapshot<T>): T {
  return { id: snapshot.id, ...(snapshot.data() as T) } as T;
}

/** Live query → Observable of model arrays with automatic cleanup. */
export function fromFirestoreQuery<T>(query: Query<T>): Observable<T[]> {
  return new Observable<T[]>((subscriber) => {
    const unsubscribe = onSnapshot(
      query,
      (snapshot) => {
        subscriber.next(snapshot.docs.map((docSnap) => withId<T>(docSnap)));
      },
      (error) => subscriber.error(error),
    );
    return unsubscribe;
  });
}

/** Live document → Observable of one model (or `null` when missing). */
export function fromFirestoreDoc<T>(reference: DocumentReference<T>): Observable<T | null> {
  return new Observable<T | null>((subscriber) => {
    const unsubscribe = onSnapshot(
      reference,
      (snapshot) => {
        subscriber.next(snapshot.exists() ? withId<T>(snapshot) : null);
      },
      (error) => subscriber.error(error),
    );
    return unsubscribe;
  });
}

/**
 * Build the `searchKeywords` prefix index for a document (§21).
 *
 * Firestore has no full-text search: we store lowercase word prefixes and
 * query with `array-contains`. Unicode property escapes keep Urdu/Arabic
 * searchable. Write-time cost, read-time simplicity, and the SearchService
 * interface can later be swapped for a dedicated search provider.
 */
export function buildSearchKeywords(...fields: Array<string | null | undefined>): string[] {
  const text = fields
    .filter((value): value is string => !!value && value.trim().length > 0)
    .join(' ')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ');

  const words = Array.from(new Set(text.split(/\s+/).filter(Boolean)));
  const keywords = new Set<string>();

  for (const word of words.slice(0, 15)) {
    if (word.length <= 3) {
      keywords.add(word);
      continue;
    }
    // Prefixes typed by a user: "rama" → matches "ramadan".
    const maxLength = Math.min(word.length, 12);
    for (let length = 3; length <= maxLength; length += 1) {
      keywords.add(word.slice(0, length));
    }
    keywords.add(word);
  }

  return Array.from(keywords).slice(0, 400);
}

/** Map Firestore error codes to friendly translation keys (§33). */
export function firestoreErrorKey(error: unknown): string {
  const code = (error as { code?: string })?.code ?? '';
  switch (code) {
    case 'permission-denied':
      return 'error.forbiddenMessage';
    case 'unavailable':
    case 'deadline-exceeded':
      return 'error.loadFailedMessage';
    case 'not-found':
      return 'error.notFoundMessage';
    default:
      return 'common.errorMessage';
  }
}

/**
 * Strips all undefined properties from an object so Firestore operations
 * never reject writes due to unsupported undefined field values.
 */
export function removeUndefined<T extends Record<string, unknown>>(data: T): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      if (value !== null && typeof value === 'object' && !Array.isArray(value) && !('toMillis' in value)) {
        result[key] = removeUndefined(value as Record<string, unknown>);
      } else {
        result[key] = value;
      }
    }
  }
  return result;
}

