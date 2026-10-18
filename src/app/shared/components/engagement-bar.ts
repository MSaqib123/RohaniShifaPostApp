import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { Observable, combineLatest, map, merge, of, switchMap } from 'rxjs';
import { ItemType } from '../../core/models';
import { AuthService } from '../../core/auth/auth.service';
import { AuthPromptService } from '../../core/auth/auth-prompt.service';
import { EngagementService } from '../../core/services/engagement.service';
import { ToastService } from '../../core/services/toast.service';
import { I18nService } from '../../i18n/i18n.service';
import { IconComponent } from './icon/icon';

interface ItemState {
  liked: boolean;
  bookmarked: boolean;
}

const NO_STATE: ItemState = { liked: false, bookmarked: false };

/**
 * Like / bookmark / jump-to-comments controls (§19).
 *
 * Guests are never dead-ended: pressing a protected control opens the sign-in
 * dialog, and once they return the *same* action replays automatically — this
 * component hands the work to `AuthPromptService`, which owns that flow.
 *
 * Counts come from the parent's live document, so a like shows up everywhere
 * without a refetch; these flags only mirror the signed-in user's own state.
 */
@Component({
  selector: 'app-engagement-bar',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './engagement-bar.html',
  styleUrl: './engagement-bar.scss',
})
export class EngagementBar {
  readonly i18n = inject(I18nService);
  private readonly auth = inject(AuthService);
  private readonly prompt = inject(AuthPromptService);
  private readonly engagement = inject(EngagementService);
  private readonly toast = inject(ToastService);
  private readonly doc = inject(DOCUMENT);

  readonly itemType = input.required<ItemType>();
  readonly itemId = input.required<string>();
  readonly likesCount = input(0);
  readonly commentsCount = input(0);
  /** Events have no comment thread — hide the comments control there. */
  readonly showComments = input(true);

  readonly liked = signal(false);
  readonly bookmarked = signal(false);

  readonly hasComments = computed(() => this.showComments() && this.commentsCount() > 0);

  constructor() {
    // Re-read this user's own like/bookmark state whenever the item or the
    // signed-in account changes; each switch resets first so a previous item's
    // state is never shown against a new one.
    const identity = toObservable(
      computed(() => ({
        uid: this.auth.user()?.uid ?? '',
        itemType: this.itemType(),
        itemId: this.itemId(),
      })),
    );

    identity
      .pipe(
        switchMap(({ uid, itemType, itemId }): Observable<ItemState> => {
          if (!uid || !itemId) return of(NO_STATE);
          const state$ = combineLatest([
            this.engagement.likedBy(uid, itemType, itemId),
            this.engagement.bookmarkedBy(uid, itemType, itemId),
          ]).pipe(map(([liked, bookmarked]) => ({ liked, bookmarked })));
          return merge(of(NO_STATE), state$);
        }),
      )
      .subscribe((state) => {
        this.liked.set(state.liked);
        this.bookmarked.set(state.bookmarked);
      });
  }

  async toggleLike(): Promise<void> {
    const itemId = this.itemId();
    if (!itemId) return;
    await this.prompt.require(this.i18n.t('common.like'), async () => {
      const uid = this.auth.user()?.uid ?? '';
      if (!uid) return;
      const next = await this.engagement.toggleLike(uid, this.itemType(), itemId);
      this.liked.set(next);
      this.toast.success(this.i18n.t(next ? 'toast.likeAdded' : 'toast.likeRemoved'));
    });
  }

  async toggleBookmark(): Promise<void> {
    const itemId = this.itemId();
    if (!itemId) return;
    await this.prompt.require(this.i18n.t('common.bookmark'), async () => {
      const uid = this.auth.user()?.uid ?? '';
      if (!uid) return;
      const next = await this.engagement.toggleBookmark(uid, this.itemType(), itemId);
      this.bookmarked.set(next);
      this.toast.success(this.i18n.t(next ? 'toast.bookmarkAdded' : 'toast.bookmarkRemoved'));
    });
  }

  /** Smooth-scroll to the comment thread and move focus to its heading. */
  focusComments(): void {
    const target = this.doc.getElementById('comments');
    if (!target) return;
    // Reduced-motion visitors get an instant jump — the glide is decoration.
    const reduceMotion = !!this.doc.defaultView?.matchMedia('(prefers-reduced-motion: reduce)')
      .matches;
    target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    target.focus({ preventScroll: true });
  }
}
