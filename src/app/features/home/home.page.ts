import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Subscription, combineLatest, catchError, of } from 'rxjs';
import { siteConfig } from '../../config/site.config';
import { Category, EventItem, Post, SiteSettings, Video } from '../../core/models';
import { AdminService } from '../../core/services/admin.service';
import { CategoryService } from '../../core/services/category.service';
import { EventService } from '../../core/services/event.service';
import { PostService } from '../../core/services/post.service';
import { VideoService } from '../../core/services/video.service';
import { FirebaseService } from '../../core/firebase/firebase.service';
import { AuthService } from '../../core/auth/auth.service';
import { I18nService } from '../../i18n/i18n.service';
import { IconComponent } from '../../shared/components/icon/icon';
import { CategoryCard } from '../../shared/components/category-card';
import { ContentStateComponent } from '../../shared/components/content-state';
import { EventCard } from '../../shared/components/event-card';
import { PostCard } from '../../shared/components/post-card';
import { ShareBar } from '../../shared/components/share-bar';
import { VideoCard } from '../../shared/components/video-card';
import { YouTubePlayerComponent } from '../../shared/components/youtube-player';
import { localizedSiteName } from '../../layout/brand-logo';

function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Home page (§53).
 *
 * Section order and visibility come from `siteConfig.homeSections`, overridden
 * by `settings/site` when the administrator curates them — so the toggles on
 * the settings screen really change this page. Every section renders real
 * Firestore content or an honest empty state, never filler (§61).
 */
@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [
    RouterLink,
    IconComponent,
    PostCard,
    VideoCard,
    EventCard,
    CategoryCard,
    ContentStateComponent,
    ShareBar,
    YouTubePlayerComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './home.page.html',
  styleUrl: './home.page.scss',
})
export class HomePage {
  readonly i18n = inject(I18nService);
  readonly config = siteConfig;
  readonly firebase = inject(FirebaseService);
  readonly auth = inject(AuthService);

  private readonly postService = inject(PostService);
  private readonly videoService = inject(VideoService);
  private readonly eventService = inject(EventService);
  private readonly categoryService = inject(CategoryService);
  private readonly adminService = inject(AdminService);

  readonly loading = signal(true);
  readonly error = signal(false);

  readonly posts = signal<Post[]>([]);
  readonly videos = signal<Video[]>([]);
  readonly events = signal<EventItem[]>([]);
  readonly categories = signal<Category[]>([]);
  readonly reminder = signal<Post | null>(null);
  readonly settings = signal<SiteSettings | null>(null);

  /** Curated selection overrides the "latest" list when the admin set one. */
  readonly featuredOverride = signal<Post[]>([]);
  private featuredSubscription: Subscription | null = null;
  private lastFeaturedIds: string[] = [];

  readonly siteName = computed(() => localizedSiteName(this.i18n.language()));
  readonly tagline = computed(() => this.i18n.localized(this.config.tagline));

  readonly heroBannerUrl = computed(() => {
    const custom = this.settings()?.heroBannerUrl;
    return custom && custom.trim() ? custom.trim() : 'images/hero-banner.jpg';
  });

  readonly heroBannerAlt = computed(() => {
    const custom = this.settings()?.heroBannerAlt;
    return custom && custom.trim() ? custom.trim() : 'Rohani Shifa Islamic Education';
  });

  readonly showOverlays = computed(() => {
    const s = this.settings();
    return s?.heroBannerShowOverlays !== false;
  });

  readonly bannerTitle = computed(() => {
    const s = this.settings();
    return s?.heroBannerTitle !== undefined &&
      s.heroBannerTitle !== null &&
      s.heroBannerTitle.trim() !== ''
      ? s.heroBannerTitle.trim()
      : 'اسلامی تعلیمات';
  });

  readonly bannerSubtitle = computed(() => {
    const s = this.settings();
    return s?.heroBannerSubtitle !== undefined &&
      s.heroBannerSubtitle !== null &&
      s.heroBannerSubtitle.trim() !== ''
      ? s.heroBannerSubtitle.trim()
      : 'قرآن و حدیث کی روشنی میں';
  });

  readonly bannerTagline = computed(() => {
    const s = this.settings();
    return s?.heroBannerTagline !== undefined &&
      s.heroBannerTagline !== null &&
      s.heroBannerTagline.trim() !== ''
      ? s.heroBannerTagline.trim()
      : 'Islamic Knowledge for a Better Life';
  });

  readonly bannerQuote = computed(() => {
    const s = this.settings();
    return s?.heroBannerQuote !== undefined &&
      s.heroBannerQuote !== null &&
      s.heroBannerQuote.trim() !== ''
      ? s.heroBannerQuote.trim()
      : 'اللہ کی رضا ہمیشہ کامیابی کی کنجی ہے';
  });

  readonly bannerQuoteLines = computed(() => {
    const q = this.bannerQuote();
    if (!q) return { line1: '', line2: '' };
    if (q.includes('\n')) {
      const parts = q.split('\n');
      return { line1: parts[0].trim(), line2: parts.slice(1).join(' ').trim() };
    }
    const words = q.split(' ');
    if (words.length >= 4 && words.length <= 8) {
      return { line1: words.slice(0, 3).join(' '), line2: words.slice(3).join(' ') };
    }
    return { line1: q, line2: '' };
  });

  readonly showPills = computed(() => {
    const s = this.settings();
    return s?.heroBannerShowPills !== false;
  });

  readonly pill1 = computed(() => this.settings()?.heroBannerPill1?.trim() || 'Quran');
  readonly pill2 = computed(() => this.settings()?.heroBannerPill2?.trim() || 'Hadith');
  readonly pill3 = computed(() => this.settings()?.heroBannerPill3?.trim() || 'Dua');
  readonly pill4 = computed(() => this.settings()?.heroBannerPill4?.trim() || 'Islamic Education');

  /** Config order + enabled flags, overridden by the saved settings (§22). */
  readonly enabledSections = computed(() => {
    const stored = this.settings()?.homeSections;
    const source = stored?.length ? stored : this.config.homeSections;
    return new Set(source.filter((section) => section.enabled).map((section) => section.id));
  });

  readonly featuredVideo = computed<Video | null>(() => {
    const id = this.settings()?.featuredVideoId;
    const list = this.videos();
    if (id) {
      const match = list.find((video) => video.id === id);
      if (match) return match;
    }
    return list.find((video) => video.featured) ?? list[0] ?? null;
  });

  readonly featuredPosts = computed<Post[]>(() => {
    const curated = this.featuredOverride();
    if (curated.length > 0) return curated.slice(0, 6);
    return this.posts().slice(0, 6);
  });

  /** Today's reminder only — older ones belong to the archive, not "today". */
  readonly todaysReminder = computed<Post | null>(() => {
    const post = this.reminder();
    if (!post?.publishedAt) return null;
    return isSameLocalDay(post.publishedAt.toDate(), new Date()) ? post : null;
  });

  readonly reminderBody = computed(() => this.i18n.localized(this.todaysReminder()?.content ?? ''));

  readonly isVisible = (sectionId: string): boolean => this.enabledSections().has(sectionId);

  constructor() {
    this.load();
  }

  retry(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.error.set(false);

    combineLatest({
      posts: this.postService.listPublished({ max: 6 }).pipe(catchError(() => of([]))),
      videos: this.videoService.listPublished({ max: 6 }).pipe(catchError(() => of([]))),
      events: this.eventService.listUpcoming(3).pipe(catchError(() => of([]))),
      categories: this.categoryService.listActive().pipe(catchError(() => of([]))),
      reminder: this.postService
        .listPublished({ type: 'reminder', max: 1 })
        .pipe(catchError(() => of([]))),
      settings: this.adminService.settings().pipe(catchError(() => of(null))),
    }).subscribe({
      next: ({ posts, videos, events, categories, reminder, settings }) => {
        this.posts.set(posts);
        this.videos.set(videos);
        this.events.set(events);
        this.categories.set(categories);
        this.reminder.set(reminder[0] ?? null);
        this.settings.set(settings);
        this.loading.set(false);
        this.applyFeatured(settings?.featuredPostIds ?? []);
      },
      error: (err) => {
        console.error('Home load error:', err);
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }

  /** Re-fetch the curated posts only when the selection actually changes. */
  private applyFeatured(ids: string[]): void {
    if (ids.join(',') === this.lastFeaturedIds.join(',')) return;
    this.lastFeaturedIds = ids;
    this.featuredSubscription?.unsubscribe();
    this.featuredSubscription = null;

    if (ids.length === 0) {
      this.featuredOverride.set([]);
      return;
    }
    this.featuredSubscription = this.postService.byIds(ids).subscribe({
      next: (posts) => this.featuredOverride.set(posts),
      error: () => this.featuredOverride.set([]),
    });
  }
}
