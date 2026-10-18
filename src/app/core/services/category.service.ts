import { Injectable, inject } from '@angular/core';
import {
  CollectionReference,
  Timestamp,
  collection,
  deleteDoc,
  doc,
  limit as limitDocs,
  orderBy,
  query,
  setDoc,
  where,
} from 'firebase/firestore';
import { Observable, catchError, map, of } from 'rxjs';
import { Category, CategoryDraft } from '../models';
import { FirebaseService } from '../firebase/firebase.service';
import { fromFirestoreQuery, removeUndefined } from '../firebase/firestore.utils';

/**
 * `categories/{id}` access layer (§15).
 *
 * Categories are fully dynamic — no topic list exists in code. The public only
 * ever sees `isActive` entries; the admin list shows everything.
 */
@Injectable({ providedIn: 'root' })
export class CategoryService {
  private readonly firebase = inject(FirebaseService);

  /** Active categories in display order (public navigation, filters, pages). */
  listActive(): Observable<Category[]> {
    if (!this.firebase.configured) return of([]);
    return fromFirestoreQuery(this.categoriesRef()).pipe(
      map((categories) => {
        return categories
          .filter((cat) => cat.isActive !== false)
          .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
      }),
      catchError((err) => {
        console.error('Error in listActive categories:', err);
        return of([]);
      }),
    );
  }

  /** Every category including inactive ones (admin management). */
  listAll(max = 200): Observable<Category[]> {
    if (!this.firebase.configured) return of([]);
    return fromFirestoreQuery(this.categoriesRef()).pipe(
      map((categories) => {
        const sorted = [...categories];
        sorted.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
        return sorted.slice(0, max);
      }),
      catchError((err) => {
        console.error('Error in listAll categories:', err);
        return of([]);
      }),
    );
  }

  /** Categories by slug — the public detail route addresses them this way. */
  bySlug(slug: string): Observable<Category[]> {
    if (!this.firebase.configured) return of([]);
    return fromFirestoreQuery(query(this.categoriesRef(), where('slug', '==', slug), limitDocs(1))).pipe(
      catchError((err) => {
        console.error('Error in bySlug categories:', err);
        return of([]);
      }),
    );
  }

  async create(draft: CategoryDraft): Promise<string> {
    const db = this.firebase.requireDb();
    const now = Timestamp.now();
    const reference = doc(collection(db, 'categories'));
    await setDoc(reference, removeUndefined({ ...draft, createdAt: now, updatedAt: now }));
    return reference.id;
  }

  async update(id: string, draft: CategoryDraft): Promise<void> {
    const db = this.firebase.requireDb();
    await setDoc(
      doc(db, 'categories', id),
      removeUndefined({ ...draft, updatedAt: Timestamp.now() }),
      { merge: true },
    );
  }

  /**
   * Delete a category (always confirmed in the UI). Content that referenced it
   * keeps working: filters simply stop offering a category that no longer
   * exists, and nothing is ever removed alongside it (§17).
   */
  async remove(id: string): Promise<void> {
    const db = this.firebase.requireDb();
    await deleteDoc(doc(db, 'categories', id));
  }

  private categoriesRef(): CollectionReference<Category> {
    return collection(this.firebase.requireDb(), 'categories') as CollectionReference<Category>;
  }
}
