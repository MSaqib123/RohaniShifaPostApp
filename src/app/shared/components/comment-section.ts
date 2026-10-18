import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { DestroyRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, catchError, of, startWith, switchMap } from 'rxjs';
import { Comment, MAX_COMMENT_LENGTH } from '../../core/models';
import { AuthService } from '../../core/auth/auth.service';
import { AuthPromptService } from '../../core/auth/auth-prompt.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { EngagementService } from '../../core/services/engagement.service';
import { ToastService } from '../../core/services/toast.service';
import { I18nService } from '../../i18n/i18n.service';
import { ContentStateComponent } from './content-state';
import { IconComponent } from './icon/icon';
import { AppDatePipe } from '../pipes/app-date.pipe';

/**
 * Comment thread for a post or video (§19).
 *
 * - Guests can type their comment first; posting opens the sign-in dialog and
 *   the *same* comment is submitted automatically once they return (§19).
 * - Text is capped at `MAX_COMMENT_LENGTH` here and again by security rules.
 * - Authors may delete their own comment after confirmation; moderation
 *   (hide/restore) lives in the admin area.
 */
@Component({
  selector: 'app-comment-section',
  standalone: true,
  imports: [RouterLink, IconComponent, ContentStateComponent, AppDatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './comment-section.html',
  styleUrl: './comment-section.scss',
})
export class CommentSection implements OnInit {
  readonly i18n = inject(I18nService);
  private readonly auth = inject(AuthService);
  private readonly prompt = inject(AuthPromptService);
  private readonly engagement = inject(EngagementService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly itemType = input.required<'post' | 'video'>();
  readonly itemId = input.required<string>();

  readonly draft = signal('');
  readonly submitting = signal(false);
  readonly formError = signal('');

  readonly comments = signal<Comment[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);

  readonly maxLength = MAX_COMMENT_LENGTH;
  readonly isLoggedIn = this.auth.isLoggedIn;
  readonly dialogOpen = this.prompt.isOpen;
  readonly remaining = computed(() => this.maxLength - this.draft().trim().length);

  /** Fires after every write so the thread refreshes in place (§33). */
  private readonly refresh$ = new Subject<void>();

  ngOnInit(): void {
    this.refresh$
      .pipe(
        startWith(undefined),
        switchMap(() => {
          const itemId = this.itemId();
          if (!itemId) return of([] as Comment[]);
          this.loading.set(true);
          this.error.set(false);
          return this.engagement.listComments(this.itemType(), itemId).pipe(
            catchError(() => {
              this.error.set(true);
              return of([] as Comment[]);
            }),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((comments) => {
        this.comments.set(comments);
        this.loading.set(false);
      });
  }

  onDraft(event: Event): void {
    this.draft.set((event.target as HTMLTextAreaElement).value);
    if (this.formError()) this.formError.set('');
  }

  retry(): void {
    this.refresh$.next();
  }

  async submit(): Promise<void> {
    const text = this.draft().trim();
    if (!text || text.length > MAX_COMMENT_LENGTH) {
      this.formError.set(this.i18n.t('comments.lengthError'));
      return;
    }
    // `text` is captured now so the identical comment posts after sign-in.
    await this.prompt.require(this.i18n.t('comments.submit'), () => this.post(text));
  }

  async remove(comment: Comment): Promise<void> {
    const confirmed = await this.confirm.confirm({
      title: this.i18n.t('comments.deleteTitle'),
      message: this.i18n.t('comments.deleteMessage'),
      confirmLabel: this.i18n.t('common.delete'),
      danger: true,
    });
    if (!confirmed) return;

    try {
      await this.engagement.removeComment(comment.id, comment.itemType, comment.itemId);
      this.toast.success(this.i18n.t('comments.deleted'));
      this.refresh$.next();
    } catch {
      this.toast.error(this.i18n.t('comments.loadError'));
    }
  }

  isOwn(comment: Comment): boolean {
    return !!comment.userId && comment.userId === (this.auth.user()?.uid ?? '');
  }

  private async post(text: string): Promise<void> {
    const uid = this.auth.user()?.uid ?? '';
    const itemId = this.itemId();
    if (!uid || !itemId) return;

    this.submitting.set(true);
    this.formError.set('');
    try {
      await this.engagement.addComment({
        itemType: this.itemType(),
        itemId,
        userId: uid,
        displayName: this.auth.displayName() || this.i18n.t('common.untitled'),
        content: text,
        parentCommentId: null,
      });
      this.draft.set('');
      this.toast.success(this.i18n.t('comments.posted'));
      this.refresh$.next();
    } catch {
      this.formError.set(this.i18n.t('comments.loadError'));
    } finally {
      this.submitting.set(false);
    }
  }
}
