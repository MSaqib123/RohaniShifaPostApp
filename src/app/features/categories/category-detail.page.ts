import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subject, combineLatest, map, startWith } from 'rxjs';
import { Category, Post, Video } from '../../core/models';
import { CategoryService } from '../../core/services/category.service';
import { PostService } from '../../core/services/post.service';
import { VideoService } from '../../core/services/video.service';
import { I18nService } from '../../i18n/i18n.service';
import { ContentStateComponent } from '../../shared/components/content-state';
import { IconComponent } from '../../shared/components/icon/icon';
import { PostCard } from '../../shared/components/post-card';
import { VideoCard } from '../../shared/components/video-card';

/**
 * Category landing page (§15): one topic, both content kinds.
 *
 * The slug comes from the URL, so category links are stable even if an admin
 * renames the display label later (only `slug` changes break links, and the
 * admin form warns about exactly that).
 */
@Component({
  selector: 'app-category-detail-page',
  standalone: true,
  imports: [RouterLink, IconComponent, PostCard, VideoCard, ContentStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './category-detail.page.html',
  styleUrl: './category-detail.page.scss',
})
export class CategoryDetailPage {
  readonly i18n = inject(I18nService);
  private readonly categoryService = inject(CategoryService);
  private readonly postService = inject(PostService);
  private readonly videoService = inject(VideoService);
  private readonly route = inject(ActivatedRoute);

  private readonly retry$ = new Subject<void>();

  private readonly categoryState = signal<{
    loading: boolean;
    error: boolean;
    category: Category | null;
  }>({ loading: true, error: false, category: null });

  readonly posts = signal<Post[]>([]);
  readonly videos = signal<Video[]>([]);
  readonly loadingContent = signal(false);

  readonly loading = computed(() => this.categoryState().loading);
  readonly error = computed(() => this.categoryState().error);
  readonly category = computed(() => this.categoryState().category);
  readonly categoryName = computed(() =>
    this.category() ? this.i18n.localized(this.category()!.name) : '',
  );
  readonly isEmpty = computed(
    () => !this.loading() && this.posts().length === 0 && this.videos().length === 0,
  );

  constructor() {
    combineLatest([
      this.route.paramMap.pipe(map((params) => params.get('slug') ?? '')),
      this.retry$.pipe(startWith(0)),
    ]).subscribe(([slug]) => this.load(slug));
  }

  retry(): void {
    this.retry$.next();
  }

  private load(slug: string): void {
    if (!slug) {
      this.categoryState.set({ loading: false, error: false, category: null });
      return;
    }

    this.categoryState.set({ loading: true, error: false, category: null });
    this.posts.set([]);
    this.videos.set([]);
    this.loadingContent.set(true);

    this.categoryService.bySlug(slug).subscribe({
      next: (matches) => {
        const category = matches[0] ?? null;
        this.categoryState.set({ loading: false, error: false, category });
        if (category) this.loadContent(category);
        else this.loadingContent.set(false);
      },
      error: () => {
        this.categoryState.set({ loading: false, error: true, category: null });
        this.loadingContent.set(false);
      },
    });
  }

  private loadContent(category: Category): void {
    this.postService.listPublished({ categoryId: category.id, max: 24 }).subscribe({
      next: (posts) => {
        this.posts.set(posts);
        this.loadingContent.set(false);
      },
      error: () => this.loadingContent.set(false),
    });

    this.videoService.listPublished({ categoryId: category.id, max: 24 }).subscribe({
      next: (videos) => this.videos.set(videos),
      error: () => this.videos.set([]),
    });
  }
}
