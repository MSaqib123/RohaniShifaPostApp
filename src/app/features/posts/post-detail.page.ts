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
import { I18nService, TranslationKey } from '../../i18n/i18n.service';
import { ContentStateComponent } from '../../shared/components/content-state';
import { ShareBar } from '../../shared/components/share-bar';
import { IconComponent } from '../../shared/components/icon/icon';
import { EngagementBar } from '../../shared/components/engagement-bar';
import { CommentSection } from '../../shared/components/comment-section';
import { VideoCard } from '../../shared/components/video-card';
import { AppDatePipe } from '../../shared/pipes/app-date.pipe';

/**
 * Single post reading view (§20).
 *
 * Source/reference/scholar/book/chapter/hadithNumber render exactly as the
 * publisher entered them (§47) — the UI never rewords a citation, and the
 * section only appears when at least one field is present.
 */
@Component({
  selector: 'app-post-detail-page',
  standalone: true,
  imports: [
    RouterLink,
    IconComponent,
    VideoCard,
    ContentStateComponent,
    AppDatePipe,
    ShareBar,
    EngagementBar,
    CommentSection,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './post-detail.page.html',
  styleUrl: './post-detail.page.scss',
})
export class PostDetailPage {
  readonly i18n = inject(I18nService);
  private readonly postService = inject(PostService);
  private readonly videoService = inject(VideoService);
  private readonly route = inject(ActivatedRoute);
  private readonly seo = inject(SeoService);

  /** Fires when the visitor presses Retry (§33 — errors always recoverable). */
  private readonly retry$ = new Subject<void>();

  private readonly state = signal<{
    loading: boolean;
    error: boolean;
    post: Post | null;
  }>({ loading: true, error: false, post: null });

  readonly loading = computed(() => this.state().loading);
  readonly error = computed(() => this.state().error);
  readonly post = computed(() => this.state().post);
  readonly related = signal<Video[]>([]);

  /** Source fields present on this post, in display order (§47). */
  readonly sourceFields = computed(() => {
    const post = this.post();
    if (!post) return [];
    const fields: Array<{ key: TranslationKey; value?: string }> = [
      { key: 'posts.source', value: post.source },
      { key: 'posts.reference', value: post.reference },
      { key: 'posts.scholar', value: post.scholar },
      { key: 'posts.book', value: post.book },
      { key: 'posts.chapter', value: post.chapter },
      { key: 'posts.hadithNumber', value: post.hadithNumber },
    ];
    return fields.filter((field) => !!field.value?.trim());
  });

  readonly paragraphs = computed(() =>
    this.i18n
      .localized(this.post()?.content ?? '')
      .split(/\n{2,}/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean),
  );

  constructor() {
    // Route id OR a manual retry restarts the load; each new emission replaces
    // the previous live listener, so navigating between posts never leaks.
    combineLatest([
      this.route.paramMap.pipe(map((params) => params.get('id') ?? '')),
      this.retry$.pipe(startWith(0)),
    ]).subscribe(([id]) => this.load(id));

    // Per-item SEO (§31): unique title, description, social image and Article
    // JSON-LD — the route-level title is only a placeholder until the post
    // loads, and `AppTitleStrategy` re-establishes it on every navigation, so
    // an empty `state` needs no cleanup here.
    //
    // The effect reads `i18n.localized()`, which tracks the language signal:
    // switching language re-publishes metadata in the new language.
    effect(() => {
      const post = this.post();
      if (!post) return;
      const title = this.i18n.localized(post.title);
      const description = this.i18n.localized(post.description).trim() || undefined;
      const image = this.seo.absoluteUrl(post.coverImage);
      const published = jsonLdDate(post.publishedAt);
      const modified = jsonLdDate(post.updatedAt) ?? published;

      this.seo.setPage({
        title,
        description,
        type: 'article',
        image: image ?? undefined,
        jsonLd: {
          '@type': 'Article',
          headline: title,
          ...(description ? { description } : {}),
          ...(image ? { image } : {}),
          ...(published ? { datePublished: published } : {}),
          ...(modified ? { dateModified: modified } : {}),
          author: post.scholar
            ? { '@type': 'Person', name: post.scholar }
            : { '@type': 'Organization', name: siteConfig.name },
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
      this.state.set({ loading: false, error: false, post: null });
      return;
    }
    this.state.set({ loading: true, error: false, post: null });
    this.postService.get(id).subscribe({
      next: (post) => {
        this.state.set({ loading: false, error: false, post });
        this.loadRelated(post);
      },
      error: () => this.state.set({ loading: false, error: true, post: null }),
    });
  }

  /** Related *videos* — `relatedVideoIds` on the post, loaded by video id (§20). */
  private loadRelated(post: Post | null): void {
    const ids = (post?.relatedVideoIds ?? []).slice(0, 3);
    if (ids.length === 0) {
      this.related.set([]);
      return;
    }
    this.videoService.byIds(ids).subscribe({
      next: (videos) => this.related.set(videos),
      error: () => this.related.set([]),
    });
  }
}
