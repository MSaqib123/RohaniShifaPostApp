import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Category, Video } from '../../core/models';
import { CategoryService } from '../../core/services/category.service';
import { VideoService } from '../../core/services/video.service';
import { I18nService } from '../../i18n/i18n.service';
import { ContentStateComponent } from '../../shared/components/content-state';
import { IconComponent } from '../../shared/components/icon/icon';
import { VideoCard } from '../../shared/components/video-card';

const PAGE_SIZE = 12;
const QUERY_LIMIT = 60;

/**
 * Public video library (§13, §20).
 *
 * Embed-only platform: this page lists YouTube metadata and thumbnails; the
 * iframe is created only when a viewer opens a single video (§13).
 */
@Component({
  selector: 'app-video-list-page',
  standalone: true,
  imports: [IconComponent, VideoCard, ContentStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './video-list.page.html',
  styleUrl: './video-list.page.scss',
})
export class VideoListPage {
  readonly i18n = inject(I18nService);
  private readonly videoService = inject(VideoService);
  private readonly categoryService = inject(CategoryService);
  private readonly route = inject(ActivatedRoute);

  readonly loading = signal(true);
  readonly error = signal(false);
  readonly videos = signal<Video[]>([]);
  readonly categories = signal<Category[]>([]);

  readonly selectedCategory = signal<string | null>(
    this.route.snapshot.queryParamMap.get('category'),
  );
  readonly visibleCount = signal(PAGE_SIZE);

  readonly visibleVideos = computed(() => this.videos().slice(0, this.visibleCount()));
  readonly hasMore = computed(() => this.visibleVideos().length < this.videos().length);
  readonly resultCount = computed(() => this.videos().length);

  private subscription: { unsubscribe(): void } | null = null;

  constructor() {
    this.categoryService.listActive().subscribe({
      next: (categories) => this.categories.set(categories),
      error: () => this.categories.set([]),
    });
    this.load();
  }

  setCategory(categoryId: string | null): void {
    this.selectedCategory.set(categoryId);
    this.visibleCount.set(PAGE_SIZE);
    this.load();
  }

  showMore(): void {
    this.visibleCount.update((count) => count + PAGE_SIZE);
  }

  retry(): void {
    this.load();
  }

  private load(): void {
    this.subscription?.unsubscribe();
    this.loading.set(true);
    this.error.set(false);

    this.subscription = this.videoService
      .listPublished({
        categoryId: this.selectedCategory(),
        max: QUERY_LIMIT,
      })
      .subscribe({
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
