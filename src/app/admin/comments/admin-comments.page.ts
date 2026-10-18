import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Comment, CommentStatus } from '../../core/models';
import { AdminService } from '../../core/services/admin.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { ToastService } from '../../core/services/toast.service';
import { I18nService, TranslationKey } from '../../i18n/i18n.service';
import { ContentStateComponent } from '../../shared/components/content-state';
import { IconComponent } from '../../shared/components/icon/icon';
import { AppDatePipe } from '../../shared/pipes/app-date.pipe';

/**
 * Comment moderation (§48).
 *
 * Moderation is reversible by design: hiding keeps the record and the author's
 * text, restoring brings it back untouched, and only an explicit confirmed
 * action deletes it. Nothing here is automatic.
 */
@Component({
  selector: 'app-admin-comments-page',
  standalone: true,
  imports: [RouterLink, IconComponent, ContentStateComponent, AppDatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-comments.page.html',
  styleUrl: './admin-comments.page.scss',
})
export class AdminCommentsPage {
  readonly i18n = inject(I18nService);
  private readonly adminService = inject(AdminService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly error = signal(false);
  readonly comments = signal<Comment[]>([]);
  readonly searchTerm = signal('');
  readonly statusFilter = signal<CommentStatus | null>(null);

  readonly statusOptions: Array<{ value: CommentStatus | null; label: string }> = [
    { value: null, label: this.i18n.t('admin.filterAll') },
    { value: 'visible', label: this.i18n.t('admin.comments.status.visible') },
    { value: 'hidden', label: this.i18n.t('admin.comments.status.hidden') },
    { value: 'flagged', label: this.i18n.t('admin.comments.status.flagged') },
  ];

  readonly filtered = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const status = this.statusFilter();
    return this.comments().filter((comment) => {
      if (status && comment.status !== status) return false;
      if (!term) return true;
      return `${comment.content} ${comment.displayName}`.toLowerCase().includes(term);
    });
  });

  readonly hasFilters = computed(
    () => this.searchTerm().trim().length > 0 || this.statusFilter() !== null,
  );

  constructor() {
    this.load();
  }

  statusLabel(status: CommentStatus): string {
    const keys: Record<CommentStatus, TranslationKey> = {
      visible: 'admin.comments.status.visible',
      hidden: 'admin.comments.status.hidden',
      flagged: 'admin.comments.status.flagged',
    };
    return this.i18n.t(keys[status]);
  }

  /** e.g. "On Posts" — links straight to the moderated item. */
  itemLabel(comment: Comment): string {
    const typeKey: TranslationKey = comment.itemType === 'post' ? 'nav.posts' : 'nav.videos';
    return this.i18n.t('admin.comments.itemLabel', { type: this.i18n.t(typeKey) });
  }

  itemLink(comment: Comment): string[] {
    return comment.itemType === 'post' ? ['/posts', comment.itemId] : ['/videos', comment.itemId];
  }

  onSearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  setStatusFilter(status: CommentStatus | null): void {
    this.statusFilter.set(status);
  }

  toStatus(event: Event): CommentStatus | null {
    const value = (event.target as HTMLSelectElement).value;
    return (value || null) as CommentStatus | null;
  }

  clearFilters(): void {
    this.searchTerm.set('');
    this.statusFilter.set(null);
  }

  retry(): void {
    this.load();
  }

  async toggleHidden(comment: Comment): Promise<void> {
    const hiding = comment.status !== 'hidden';
    const confirmed = await this.confirm.confirm({
      title: this.i18n.t(hiding ? 'admin.comments.hideTitle' : 'admin.comments.restoreTitle'),
      message: this.i18n.t('comments.deleteMessage'),
      confirmLabel: this.i18n.t(hiding ? 'comments.hide' : 'comments.restore'),
      danger: hiding,
    });
    if (!confirmed) return;

    const next: CommentStatus = hiding ? 'hidden' : 'visible';
    try {
      await this.adminService.setCommentStatus(comment.id, next);
      this.comments.update((items) =>
        items.map((item) => (item.id === comment.id ? { ...item, status: next } : item)),
      );
      this.toast.success(
        this.i18n.t(hiding ? 'admin.comments.commentHidden' : 'admin.comments.commentRestored'),
      );
    } catch {
      this.toast.error(this.i18n.t('common.errorMessage'));
    }
  }

  async remove(comment: Comment): Promise<void> {
    const confirmed = await this.confirm.confirm({
      title: this.i18n.t('admin.comments.deleteCommentTitle'),
      message: this.i18n.t('comments.deleteMessage'),
      confirmLabel: this.i18n.t('common.delete'),
      danger: true,
    });
    if (!confirmed) return;

    try {
      await this.adminService.deleteComment(comment.id);
      this.comments.update((items) => items.filter((item) => item.id !== comment.id));
      this.toast.success(this.i18n.t('admin.comments.deleted'));
    } catch {
      this.toast.error(this.i18n.t('common.errorMessage'));
    }
  }

  private load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.adminService.listComments().subscribe({
      next: (comments) => {
        this.comments.set(comments);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }
}
