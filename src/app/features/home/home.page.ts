import { ChangeDetectionStrategy, Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Subscription, combineLatest, catchError, of } from 'rxjs';
import { siteConfig } from '../../config/site.config';
import { Category, EventItem, Post, SiteSettings, Video } from '../../core/models';
import { AdminService } from '../../core/services/admin.service';
import { CategoryService } from '../../core/services/category.service';
import { EventService } from '../../core/services/event.service';
import { PostService } from '../../core/services/post.service';
import { VideoService } from '../../core/services/video.service';
import { AiReminderService } from '../../core/services/ai-reminder.service';
import { ToastService } from '../../core/services/toast.service';
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

export interface BannerOverlaysConfig {
  title: Record<'en' | 'ur' | 'ar', string>;
  subtitle: Record<'en' | 'ur' | 'ar', string>;
  tagline: Record<'en' | 'ur' | 'ar', string>;
  quote: Record<'en' | 'ur' | 'ar', string>;
  pill1: Record<'en' | 'ur' | 'ar', string>;
  pill2: Record<'en' | 'ur' | 'ar', string>;
  pill3: Record<'en' | 'ur' | 'ar', string>;
  pill4: Record<'en' | 'ur' | 'ar', string>;
}

export const DEFAULT_BANNER_OVERLAYS: BannerOverlaysConfig = {
  title: {
    ur: 'اسلامی تعلیمات',
    en: 'Islamic Teachings',
    ar: 'التعاليم الإسلامية',
  },
  subtitle: {
    ur: 'قرآن و حدیث کی روشنی میں',
    en: 'In the Light of Quran & Hadith',
    ar: 'في ضوء القرآن والحديث',
  },
  tagline: {
    ur: 'Islamic Knowledge for a Better Life',
    en: 'Islamic Knowledge for a Better Life',
    ar: 'المعرفة الإسلامية لحياة أفضل',
  },
  quote: {
    ur: 'اللہ کی رضا\nہمیشہ کامیابی کی کنجی ہے',
    en: 'Pleasing Allah\nis the key to eternal success',
    ar: 'رضا الله\nهو مفتاح النجاح الدائم',
  },
  pill1: {
    ur: 'قرآن',
    en: 'Quran',
    ar: 'القرآن',
  },
  pill2: {
    ur: 'حدیث',
    en: 'Hadith',
    ar: 'الحديث',
  },
  pill3: {
    ur: 'دعا',
    en: 'Dua',
    ar: 'الدعاء',
  },
  pill4: {
    ur: 'اسلامی تعلیم',
    en: 'Islamic Education',
    ar: 'التعليم الإسلامي',
  },
};

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
export class HomePage implements OnDestroy {
  readonly i18n = inject(I18nService);
  readonly config = siteConfig;
  readonly firebase = inject(FirebaseService);
  readonly auth = inject(AuthService);

  private readonly postService = inject(PostService);
  private readonly videoService = inject(VideoService);
  private readonly eventService = inject(EventService);
  private readonly categoryService = inject(CategoryService);
  private readonly adminService = inject(AdminService);
  private readonly aiReminderService = inject(AiReminderService);
  private readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly error = signal(false);

  readonly posts = signal<Post[]>([]);
  readonly videos = signal<Video[]>([]);
  readonly events = signal<EventItem[]>([]);
  readonly categories = signal<Category[]>([]);
  readonly reminder = signal<Post | null>(null);

  /**
   * Synchronously seed with cached site settings if present so that the active
   * banner image and overlay mode are active on frame 0 without flickering.
   */
  readonly settings = signal<SiteSettings | null>(this.adminService.getCachedSettings());
  readonly settingsLoaded = signal<boolean>(!!this.adminService.getCachedSettings());

  /** Curated selection overrides the "latest" list when the admin set one. */
  readonly featuredOverride = signal<Post[]>([]);
  private featuredSubscription: Subscription | null = null;
  private settingsSubscription: Subscription | null = null;
  private contentSubscription: Subscription | null = null;
  private lastFeaturedIds: string[] = [];

  readonly siteName = computed(() => localizedSiteName(this.i18n.language()));
  readonly tagline = computed(() => this.i18n.localized(this.config.tagline));

  readonly heroBannerUrl = computed(() => {
    const s = this.settings();
    if (s?.heroBannerImages && s.heroBannerActiveIndex !== undefined) {
      const slotImg = s.heroBannerImages[s.heroBannerActiveIndex];
      if (slotImg && slotImg.trim()) return slotImg.trim();
    }
    const custom = s?.heroBannerUrl;
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
    const custom = this.settings()?.heroBannerTitle;
    if (custom) {
      const text = this.i18n.localized(custom);
      if (text.trim()) return text.trim();
    }
    const lang = this.i18n.language();
    return DEFAULT_BANNER_OVERLAYS.title[lang] ?? DEFAULT_BANNER_OVERLAYS.title.ur;
  });

  readonly bannerSubtitle = computed(() => {
    const custom = this.settings()?.heroBannerSubtitle;
    if (custom) {
      const text = this.i18n.localized(custom);
      if (text.trim()) return text.trim();
    }
    const lang = this.i18n.language();
    return DEFAULT_BANNER_OVERLAYS.subtitle[lang] ?? DEFAULT_BANNER_OVERLAYS.subtitle.ur;
  });

  readonly bannerTagline = computed(() => {
    const custom = this.settings()?.heroBannerTagline;
    if (custom) {
      const text = this.i18n.localized(custom);
      if (text.trim()) return text.trim();
    }
    const lang = this.i18n.language();
    return DEFAULT_BANNER_OVERLAYS.tagline[lang] ?? DEFAULT_BANNER_OVERLAYS.tagline.en;
  });

  readonly bannerQuote = computed(() => {
    const custom = this.settings()?.heroBannerQuote;
    if (custom) {
      const text = this.i18n.localized(custom);
      if (text.trim()) return text.trim();
    }
    const lang = this.i18n.language();
    return DEFAULT_BANNER_OVERLAYS.quote[lang] ?? DEFAULT_BANNER_OVERLAYS.quote.ur;
  });

  readonly bannerQuoteLines = computed(() => {
    const q = this.bannerQuote();
    if (!q) return { line1: '', line2: '' };
    if (q.includes('\n')) {
      const parts = q.split('\n');
      return { line1: parts[0].trim(), line2: parts.slice(1).join(' ').trim() };
    }
    const words = q.split(' ');
    if (words.length >= 3 && words.length <= 8) {
      const half = Math.ceil(words.length / 2);
      return { line1: words.slice(0, half).join(' '), line2: words.slice(half).join(' ') };
    }
    return { line1: q, line2: '' };
  });

  readonly showPills = computed(() => {
    const s = this.settings();
    return s?.heroBannerShowPills !== false;
  });

  readonly pill1 = computed(() => {
    const custom = this.settings()?.heroBannerPill1;
    if (custom) {
      const text = this.i18n.localized(custom);
      if (text.trim()) return text.trim();
    }
    const lang = this.i18n.language();
    return DEFAULT_BANNER_OVERLAYS.pill1[lang] ?? DEFAULT_BANNER_OVERLAYS.pill1.ur;
  });

  readonly pill2 = computed(() => {
    const custom = this.settings()?.heroBannerPill2;
    if (custom) {
      const text = this.i18n.localized(custom);
      if (text.trim()) return text.trim();
    }
    const lang = this.i18n.language();
    return DEFAULT_BANNER_OVERLAYS.pill2[lang] ?? DEFAULT_BANNER_OVERLAYS.pill2.ur;
  });

  readonly pill3 = computed(() => {
    const custom = this.settings()?.heroBannerPill3;
    if (custom) {
      const text = this.i18n.localized(custom);
      if (text.trim()) return text.trim();
    }
    const lang = this.i18n.language();
    return DEFAULT_BANNER_OVERLAYS.pill3[lang] ?? DEFAULT_BANNER_OVERLAYS.pill3.ur;
  });

  readonly pill4 = computed(() => {
    const custom = this.settings()?.heroBannerPill4;
    if (custom) {
      const text = this.i18n.localized(custom);
      if (text.trim()) return text.trim();
    }
    const lang = this.i18n.language();
    return DEFAULT_BANNER_OVERLAYS.pill4[lang] ?? DEFAULT_BANNER_OVERLAYS.pill4.ur;
  });

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

  /** Today's reminder — if no human created one today, fallback to Auto AI */
  readonly todaysReminder = computed<Post | null>(() => {
    const post = this.reminder();
    if (post?.publishedAt && isSameLocalDay(post.publishedAt.toDate(), new Date())) {
      return post;
    }
    const autoAiEnabled = this.settings()?.autoAiReminderEnabled !== false;
    if (autoAiEnabled) {
      return this.aiReminderService.getTodayAiReminder();
    }
    return null;
  });

  readonly isAiReminder = computed<boolean>(() => {
    const r = this.todaysReminder();
    return !!(r && r.id?.startsWith('ai-reminder-'));
  });

  readonly publishingAiReminder = signal(false);

  async publishAiReminder(): Promise<void> {
    const user = this.auth.user();
    const item = this.todaysReminder();
    if (!item) return;

    this.publishingAiReminder.set(true);
    try {
      await this.aiReminderService.publishAiReminderToDatabase(user?.uid ?? 'admin', item);
      this.toast.success(this.i18n.t('home.aiReminderPublished'));
      this.load();
    } catch (err) {
      console.error('Failed to publish AI reminder:', err);
      this.toast.error(this.i18n.t('common.errorMessage'));
    } finally {
      this.publishingAiReminder.set(false);
    }
  }

  async copyReminderText(post: Post): Promise<void> {
    const title = this.i18n.localized(post.title);
    const content = this.i18n.localized(post.content);
    const textToCopy = `${title}\n\n${content}\n\nSource: ${post.reference || post.source || 'Rohani Shifa'}`;
    try {
      await navigator.clipboard.writeText(textToCopy);
      this.toast.success(this.i18n.t('home.reflectionCopied'));
    } catch {
      this.toast.error(this.i18n.t('common.errorMessage'));
    }
  }

  readonly reminderBody = computed(() => this.i18n.localized(this.todaysReminder()?.content ?? ''));

  readonly isVisible = (sectionId: string): boolean => this.enabledSections().has(sectionId);

  constructor() {
    this.subscribeSettings();
    this.load();
  }

  ngOnDestroy(): void {
    this.settingsSubscription?.unsubscribe();
    this.featuredSubscription?.unsubscribe();
    this.contentSubscription?.unsubscribe();
  }

  retry(): void {
    this.load();
  }

  private subscribeSettings(): void {
    this.settingsSubscription?.unsubscribe();
    this.settingsSubscription = this.adminService
      .settings()
      .pipe(catchError(() => of(null)))
      .subscribe({
        next: (settings) => {
          if (settings) {
            this.settings.set(settings);
            this.settingsLoaded.set(true);
            this.applyFeatured(settings.featuredPostIds ?? []);
          } else {
            this.settingsLoaded.set(true);
          }
        },
        error: () => {
          this.settingsLoaded.set(true);
        },
      });
  }

  private load(): void {
    this.loading.set(true);
    this.error.set(false);

    this.contentSubscription?.unsubscribe();
    this.contentSubscription = combineLatest({
      posts: this.postService.listPublished({ max: 6 }).pipe(catchError(() => of([]))),
      videos: this.videoService.listPublished({ max: 6 }).pipe(catchError(() => of([]))),
      events: this.eventService.listUpcoming(3).pipe(catchError(() => of([]))),
      categories: this.categoryService.listActive().pipe(catchError(() => of([]))),
      reminder: this.postService
        .listPublished({ type: 'reminder', max: 1 })
        .pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ posts, videos, events, categories, reminder }) => {
        this.posts.set(posts);
        this.videos.set(videos);
        this.events.set(events);
        this.categories.set(categories);
        this.reminder.set(reminder[0] ?? null);
        this.loading.set(false);
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
