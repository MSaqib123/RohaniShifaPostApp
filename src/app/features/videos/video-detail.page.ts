import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subject, combineLatest, map, startWith } from 'rxjs';
import { siteConfig } from '../../config/site.config';
import { Post, Video } from '../../core/models';
import { PostService } from '../../core/services/post.service';
import { SeoService, jsonLdDate } from '../../core/services/seo.service';
import { VideoService } from '../../core/services/video.service';
import { youtubeEmbedUrl, youtubeThumbnailUrl } from '../../core/services/youtube';
import { I18nService } from '../../i18n/i18n.service';
import { ContentStateComponent } from '../../shared/components/content-state';
import { PostCard } from '../../shared/components/post-card';
import { ShareBar } from '../../shared/components/share-bar';
import { EngagementBar } from '../../shared/components/engagement-bar';
import { CommentSection } from '../../shared/components/comment-section';
import { IconComponent } from '../../shared/components/icon/icon';
import { YouTubePlayerComponent } from '../../shared/components/youtube-player';
import { AppDatePipe } from '../../shared/pipes/app-date.pipe';

/**
 * Single video view (§13).
 *
 * The embed is click-to-load (privacy + performance), the canonical YouTube
 * link is always offered, and related posts are shown as real cards rather
 * than a dead "related" heading (§61).
 */
@Component({
  selector: 'app-video-detail-page',
  standalone: true,
  imports: [
    RouterLink,
    IconComponent,
    YouTubePlayerComponent,
    PostCard,
    ContentStateComponent,
    AppDatePipe,
    ShareBar,
    EngagementBar,
    CommentSection,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './video-detail.page.html',
  styleUrl: './video-detail.page.scss',
})
export class VideoDetailPage {
  readonly i18n = inject(I18nService);
  private readonly videoService = inject(VideoService);
  private readonly postService = inject(PostService);
  private readonly route = inject(ActivatedRoute);
  private readonly seo = inject(SeoService);

  private readonly retry$ = new Subject<void>();

  private readonly state = signal<{
    loading: boolean;
    error: boolean;
    video: Video | null;
  }>({ loading: true, error: false, video: null });

  readonly loading = computed(() => this.state().loading);
  readonly error = computed(() => this.state().error);
  readonly video = computed(() => this.state().video);
  readonly related = signal<Post[]>([]);

  readonly description = computed(() => this.i18n.localized(this.video()?.description));

  constructor() {
    combineLatest([
      this.route.paramMap.pipe(map((params) => params.get('id') ?? '')),
      this.retry$.pipe(startWith(0)),
    ]).subscribe(([id]) => this.load(id));

    // Per-video SEO (§31): unique metadata + VideoObject JSON-LD so social
    // shares and search results show this lecture, not the generic route.
    // Re-runs on language switch for translated metadata.
    effect(() => {
      const video = this.video();
      if (!video) return;
      const title = this.i18n.localized(video.title);
      const description = this.i18n.localized(video.description).trim() || undefined;
      const image = this.seo.absoluteUrl(
        video.thumbnailUrl || youtubeThumbnailUrl(video.youtubeId),
      );
      const published = jsonLdDate(video.publishedAt) ?? jsonLdDate(video.createdAt);

      this.seo.setPage({
        title,
        description,
        type: 'video.other',
        image: image ?? undefined,
        jsonLd: {
          '@type': 'VideoObject',
          name: title,
          ...(description ? { description } : {}),
          ...(image ? { thumbnailUrl: image } : {}),
          ...(published ? { uploadDate: published } : {}),
          embedUrl: youtubeEmbedUrl(video.youtubeId),
          publisher: { '@type': 'Organization', name: siteConfig.name },
        },
      });
    });
  }

  retry(): void {
    this.retry$.next();
  }

  private load(id: string): void {
    if (!id) {
      this.state.set({ loading: false, error: false, video: null });
      return;
    }
    this.state.set({ loading: true, error: false, video: null });
    this.videoService.get(id).subscribe({
      next: (video) => {
        this.state.set({ loading: false, error: false, video });
        this.loadRelated(video);
      },
      error: () => this.state.set({ loading: false, error: true, video: null }),
    });
  }

  private loadRelated(video: Video | null): void {
    const ids = (video?.relatedPostIds ?? []).slice(0, 3);
    if (ids.length === 0) {
      this.related.set([]);
      return;
    }
    this.postService.byIds(ids).subscribe({
      next: (posts) => this.related.set(posts.filter((item) => item.id !== video?.id)),
      error: () => this.related.set([]),
    });
  }
}
