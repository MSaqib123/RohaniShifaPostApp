import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Video } from '../../core/models';
import { VideoService } from '../../core/services/video.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { ToastService } from '../../core/services/toast.service';
import { I18nService, TranslationKey } from '../../i18n/i18n.service';
import { ContentStateComponent } from '../../shared/components/content-state';
import { IconComponent } from '../../shared/components/icon/icon';
import { AppDatePipe } from '../../shared/pipes/app-date.pipe';

/**
 * Admin video management (§22).
 *
 * Embed-only platform: the list shows the stored YouTube reference, never a
 * media library, and deleting a video always goes through a confirmation.
 */
@Component({
  selector: 'app-admin-videos-page',
  standalone: true,
  imports: [RouterLink, IconComponent, ContentStateComponent, AppDatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-videos.page.html',
  styleUrl: './admin-videos.page.scss',
})
export class AdminVideosPage {
  readonly i18n = inject(I18nService);
  private readonly videoService = inject(VideoService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly error = signal(false);
  readonly videos = signal<Video[]>([]);

  readonly searchTerm = signal('');
  readonly statusFilter = signal<Video['status'] | null>(null);

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
    return this.videos().filter((video) => {
      if (status && video.status !== status) return false;
      if (!term) return true;
      return this.titleOf(video).toLowerCase().includes(term);
    });
  });

  readonly hasFilters = computed(
    () => this.searchTerm().trim().length > 0 || this.statusFilter() !== null,
  );

  constructor() {
    this.load();
  }

  titleOf(video: Video): string {
    return this.i18n.localized(video.title) || this.i18n.t('common.untitled');
  }

  statusLabel(status: Video['status']): string {
    const keys: Record<Video['status'], TranslationKey> = {
      published: 'common.published',
      draft: 'common.draft',
      unpublished: 'common.unpublished',
      archived: 'common.archived',
    };
    return this.i18n.t(keys[status]);
  }

  onSearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  setStatus(status: Video['status'] | null): void {
    this.statusFilter.set(status);
  }

  /** `<select>` emits strings; `''` means "no status filter". */
  toStatus(event: Event): Video['status'] | null {
    const value = (event.target as HTMLSelectElement).value;
    return (value || null) as Video['status'] | null;
  }

  clearFilters(): void {
    this.searchTerm.set('');
    this.statusFilter.set(null);
  }

  retry(): void {
    this.load();
  }

  async remove(video: Video): Promise<void> {
    const title = this.titleOf(video);
    const confirmed = await this.confirm.confirm({
      title: this.i18n.t('admin.confirmedDeleteTitle', { title }),
      message: this.i18n.t('admin.videoForm.deleteTitle'),
      confirmLabel: this.i18n.t('common.delete'),
      danger: true,
    });
    if (!confirmed) return;

    try {
      await this.videoService.remove(video.id);
      this.videos.update((items) => items.filter((item) => item.id !== video.id));
      this.toast.success(this.i18n.t('admin.videoForm.deleted'));
    } catch {
      this.toast.error(this.i18n.t('common.errorMessage'));
    }
  }

  private load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.videoService.listAll().subscribe({
      next: (videos) => {
        this.videos.set(videos);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }
}
