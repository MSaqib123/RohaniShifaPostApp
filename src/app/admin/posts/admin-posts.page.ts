import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Post, PostType } from '../../core/models';
import { PostService } from '../../core/services/post.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { ToastService } from '../../core/services/toast.service';
import { I18nService, TranslationKey } from '../../i18n/i18n.service';
import { ContentStateComponent } from '../../shared/components/content-state';
import { IconComponent } from '../../shared/components/icon/icon';
import { AppDatePipe } from '../../shared/pipes/app-date.pipe';

/**
 * Admin post management (§22).
 *
 * Client-side filtering only narrows what the admin list already loaded —
 * search-as-you-type without a server round-trip, and it says so honestly
 * when nothing matches the current filters (§61).
 */
@Component({
  selector: 'app-admin-posts-page',
  standalone: true,
  imports: [RouterLink, IconComponent, ContentStateComponent, AppDatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-posts.page.html',
  styleUrl: './admin-posts.page.scss',
})
export class AdminPostsPage {
  readonly i18n = inject(I18nService);
  private readonly postService = inject(PostService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly error = signal(false);
  readonly posts = signal<Post[]>([]);

  readonly searchTerm = signal('');
  readonly statusFilter = signal<Post['status'] | null>(null);

  readonly statusOptions = computed(() => [
    { value: null, label: this.i18n.t('admin.filterAll') },
    { value: 'published' as const, label: this.i18n.t('common.published') },
    { value: 'draft' as const, label: this.i18n.t('common.draft') },
    { value: 'unpublished' as const, label: this.i18n.t('common.unpublished') },
    { value: 'archived' as const, label: this.i18n.t('common.archived') },
  ]);

  readonly filtered = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const status = this.statusFilter();
    return this.posts().filter((post) => {
      if (status && post.status !== status) return false;
      if (!term) return true;
      return this.titleOf(post).toLowerCase().includes(term);
    });
  });

  readonly hasFilters = computed(
    () => this.searchTerm().trim().length > 0 || this.statusFilter() !== null,
  );

  constructor() {
    this.load();
  }

  titleOf(post: Post): string {
    return this.i18n.localized(post.title) || this.i18n.t('common.untitled');
  }

  statusLabel(status: Post['status']): string {
    const keys: Record<Post['status'], TranslationKey> = {
      published: 'common.published',
      draft: 'common.draft',
      unpublished: 'common.unpublished',
      archived: 'common.archived',
    };
    return this.i18n.t(keys[status]);
  }

  typeLabel(type: PostType): string {
    return this.i18n.t(`posts.type.${type}` as TranslationKey);
  }

  onSearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  /** `<select>` emits strings; `''` means "no status filter". */
  toStatus(event: Event): Post['status'] | null {
    const value = (event.target as HTMLSelectElement).value;
    return (value || null) as Post['status'] | null;
  }

  setStatus(status: Post['status'] | null): void {
    this.statusFilter.set(status);
  }

  clearFilters(): void {
    this.searchTerm.set('');
    this.statusFilter.set(null);
  }

  retry(): void {
    this.load();
  }

  async remove(post: Post): Promise<void> {
    const title = this.titleOf(post);
    const confirmed = await this.confirm.confirm({
      title: this.i18n.t('admin.confirmedDeleteTitle', { title }),
      message: this.i18n.t('admin.confirmedDeleteMessage'),
      confirmLabel: this.i18n.t('common.delete'),
      danger: true,
    });
    if (!confirmed) return;

    try {
      await this.postService.remove(post.id);
      this.posts.update((items) => items.filter((item) => item.id !== post.id));
      this.toast.success(this.i18n.t('admin.postForm.deleted'));
    } catch {
      this.toast.error(this.i18n.t('common.errorMessage'));
    }
  }

  private load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.postService.listAll().subscribe({
      next: (posts) => {
        this.posts.set(posts);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }
}
