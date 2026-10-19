import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Post, SiteSettings, Video } from '../../core/models';
import { AdminService } from '../../core/services/admin.service';
import { PostService } from '../../core/services/post.service';
import { VideoService } from '../../core/services/video.service';
import { ToastService } from '../../core/services/toast.service';
import { I18nService, TranslationKey } from '../../i18n/i18n.service';
import { siteConfig } from '../../config/site.config';
import { ContentStateComponent } from '../../shared/components/content-state';
import { IconComponent } from '../../shared/components/icon/icon';

/** Human labels for the section ids defined in `siteConfig.homeSections`. */
const SECTION_KEYS: Record<string, TranslationKey> = {
  hero: 'home.heroKicker',
  dailyReminder: 'home.dailyTitle',
  featuredVideo: 'home.featuredVideo',
  latestPosts: 'home.latestPosts',
  latestVideos: 'home.latestVideos',
  upcomingEvents: 'home.upcomingEvents',
  categories: 'home.popularCategories',
  cta: 'home.ctaTitle',
};

/**
 * Platform settings (§22).
 *
 * Everything here changes what visitors actually see: the featured video,
 * the featured posts and which home sections are shown. The home page reads
 * the same `settings/site` document, so nothing on this screen is cosmetic.
 */
@Component({
  selector: 'app-admin-settings-page',
  standalone: true,
  imports: [RouterLink, IconComponent, ContentStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-settings.page.html',
  styleUrl: './admin-settings.page.scss',
})
export class AdminSettingsPage {
  readonly i18n = inject(I18nService);
  private readonly adminService = inject(AdminService);
  private readonly postService = inject(PostService);
  private readonly videoService = inject(VideoService);
  private readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly error = signal(false);
  readonly saving = signal(false);

  readonly posts = signal<Post[]>([]);
  readonly videos = signal<Video[]>([]);

  readonly featuredPostIds = signal<string[]>([]);
  readonly featuredVideoId = signal<string | null>(null);
  readonly sections = signal<Array<{ id: string; enabled: boolean }>>(
    siteConfig.homeSections.map((section) => ({ ...section })),
  );

  readonly heroBannerUrl = signal<string>('');
  readonly heroBannerAlt = signal<string>('');
  readonly heroBannerShowOverlays = signal<boolean>(true);
  readonly heroBannerTitle = signal<string>('اسلامی تعلیمات');
  readonly heroBannerSubtitle = signal<string>('قرآن و حدیث کی روشنی میں');
  readonly heroBannerTagline = signal<string>('Islamic Knowledge for a Better Life');
  readonly heroBannerQuote = signal<string>('اللہ کی رضا ہمیشہ کامیابی کی کنجی ہے');
  readonly heroBannerShowPills = signal<boolean>(true);
  readonly heroBannerPill1 = signal<string>('Quran');
  readonly heroBannerPill2 = signal<string>('Hadith');
  readonly heroBannerPill3 = signal<string>('Dua');
  readonly heroBannerPill4 = signal<string>('Islamic Education');
  readonly bannerDimensions = signal<{ width: number; height: number; sizeStr: string } | null>(
    null,
  );
  readonly isDragging = signal<boolean>(false);

  readonly currentBannerPreview = computed(() => {
    const custom = this.heroBannerUrl().trim();
    return custom || 'images/hero-banner.jpg';
  });

  readonly postSearch = signal('');

  readonly filteredPosts = computed(() => {
    const term = this.postSearch().trim().toLowerCase();
    if (!term) return this.posts();
    return this.posts().filter((post) => this.titleOf(post).toLowerCase().includes(term));
  });

  constructor() {
    this.load();
  }

  titleOf(post: Post): string {
    return this.i18n.localized(post.title) || this.i18n.t('common.untitled');
  }

  videoTitle(video: Video): string {
    return this.i18n.localized(video.title) || this.i18n.t('common.untitled');
  }

  sectionLabel(id: string): string {
    const key = SECTION_KEYS[id];
    return key ? this.i18n.t(key) : id;
  }

  isPostSelected(id: string): boolean {
    return this.featuredPostIds().includes(id);
  }

  isSectionEnabled(id: string): boolean {
    return this.sections().find((section) => section.id === id)?.enabled ?? true;
  }

  togglePost(id: string): void {
    this.featuredPostIds.update((ids) =>
      ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id],
    );
  }

  setFeaturedVideo(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.featuredVideoId.set(value || null);
  }

  toggleSection(id: string): void {
    this.sections.update((items) =>
      items.map((section) =>
        section.id === id ? { ...section, enabled: !section.enabled } : section,
      ),
    );
  }

  onPostSearch(event: Event): void {
    this.postSearch.set((event.target as HTMLInputElement).value);
  }

  onBannerUrlChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.heroBannerUrl.set(value);
    if (value.trim()) {
      this.probeImageDimensions(value.trim());
    } else {
      this.bannerDimensions.set(null);
    }
  }

  onBannerAltChange(event: Event): void {
    this.heroBannerAlt.set((event.target as HTMLInputElement).value);
  }

  onBannerShowOverlaysToggle(event: Event): void {
    this.heroBannerShowOverlays.set((event.target as HTMLInputElement).checked);
  }

  onBannerTitleChange(event: Event): void {
    this.heroBannerTitle.set((event.target as HTMLInputElement).value);
  }

  onBannerSubtitleChange(event: Event): void {
    this.heroBannerSubtitle.set((event.target as HTMLInputElement).value);
  }

  onBannerTaglineChange(event: Event): void {
    this.heroBannerTagline.set((event.target as HTMLInputElement).value);
  }

  onBannerQuoteChange(event: Event): void {
    this.heroBannerQuote.set((event.target as HTMLInputElement).value);
  }

  onBannerShowPillsToggle(event: Event): void {
    this.heroBannerShowPills.set((event.target as HTMLInputElement).checked);
  }

  onBannerPill1Change(event: Event): void {
    this.heroBannerPill1.set((event.target as HTMLInputElement).value);
  }

  onBannerPill2Change(event: Event): void {
    this.heroBannerPill2.set((event.target as HTMLInputElement).value);
  }

  onBannerPill3Change(event: Event): void {
    this.heroBannerPill3.set((event.target as HTMLInputElement).value);
  }

  onBannerPill4Change(event: Event): void {
    this.heroBannerPill4.set((event.target as HTMLInputElement).value);
  }

  resetDefaultBanner(): void {
    this.heroBannerUrl.set('');
    this.heroBannerAlt.set('');
    this.bannerDimensions.set(null);
    this.heroBannerShowOverlays.set(true);
    this.heroBannerTitle.set('اسلامی تعلیمات');
    this.heroBannerSubtitle.set('قرآن و حدیث کی روشنی میں');
    this.heroBannerTagline.set('Islamic Knowledge for a Better Life');
    this.heroBannerQuote.set('اللہ کی رضا ہمیشہ کامیابی کی کنجی ہے');
    this.heroBannerShowPills.set(true);
    this.heroBannerPill1.set('Quran');
    this.heroBannerPill2.set('Hadith');
    this.heroBannerPill3.set('Dua');
    this.heroBannerPill4.set('Islamic Education');
  }

  onBannerDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(true);
  }

  onBannerDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
  }

  onBannerDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      void this.processBannerFile(files[0]);
    }
  }

  onBannerFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (files && files.length > 0) {
      void this.processBannerFile(files[0]);
    }
    input.value = '';
  }

  private async processBannerFile(file: File): Promise<void> {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      this.toast.error(this.i18n.t('admin.settings.invalidImage'));
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      this.toast.error(this.i18n.t('admin.settings.invalidImage'));
      return;
    }

    const sizeStr =
      file.size > 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.round(file.size / 1024)} KB`;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const img = new Image();
      img.onload = () => {
        let finalUrl = result;
        const maxW = 1600;
        if (img.naturalWidth > maxW) {
          const canvas = document.createElement('canvas');
          const scale = maxW / img.naturalWidth;
          canvas.width = maxW;
          canvas.height = Math.round(img.naturalHeight * scale);
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            finalUrl = canvas.toDataURL('image/jpeg', 0.88);
          }
        }
        this.heroBannerUrl.set(finalUrl);
        this.bannerDimensions.set({
          width: img.naturalWidth,
          height: img.naturalHeight,
          sizeStr,
        });
        this.toast.success(this.i18n.t('admin.settings.bannerUploaded'));
      };
      img.onerror = () => {
        this.toast.error(this.i18n.t('admin.settings.invalidImage'));
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  }

  private probeImageDimensions(url: string): void {
    const img = new Image();
    img.onload = () => {
      this.bannerDimensions.set({
        width: img.naturalWidth,
        height: img.naturalHeight,
        sizeStr: 'URL link',
      });
    };
    img.onerror = () => {
      this.bannerDimensions.set(null);
    };
    img.src = url;
  }

  onSubmit(event: Event): void {
    event.preventDefault();
    void this.save();
  }

  retry(): void {
    this.load();
  }

  async save(): Promise<void> {
    this.saving.set(true);
    const patch: SiteSettings = {
      featuredPostIds: this.featuredPostIds(),
      featuredVideoId: this.featuredVideoId(),
      homeSections: this.sections(),
      heroBannerUrl: this.heroBannerUrl().trim() || null,
      heroBannerAlt: this.heroBannerAlt().trim() || null,
      heroBannerShowOverlays: this.heroBannerShowOverlays(),
      heroBannerTitle: this.heroBannerTitle().trim() || null,
      heroBannerSubtitle: this.heroBannerSubtitle().trim() || null,
      heroBannerTagline: this.heroBannerTagline().trim() || null,
      heroBannerQuote: this.heroBannerQuote().trim() || null,
      heroBannerShowPills: this.heroBannerShowPills(),
      heroBannerPill1: this.heroBannerPill1().trim() || null,
      heroBannerPill2: this.heroBannerPill2().trim() || null,
      heroBannerPill3: this.heroBannerPill3().trim() || null,
      heroBannerPill4: this.heroBannerPill4().trim() || null,
    };
    try {
      await this.adminService.saveSettings(patch);
      this.toast.success(this.i18n.t('admin.settings.saved'));
    } catch {
      this.toast.error(this.i18n.t('common.errorMessage'));
    } finally {
      this.saving.set(false);
    }
  }

  private load(): void {
    this.loading.set(true);
    this.error.set(false);

    let pending = 3;
    const done = (): void => {
      pending -= 1;
      if (pending === 0) this.loading.set(false);
    };

    this.postService.listPublished({ max: 50 }).subscribe({
      next: (posts) => {
        this.posts.set(posts);
        done();
      },
      error: () => {
        this.error.set(true);
        done();
      },
    });

    this.videoService.listPublished({ max: 50 }).subscribe({
      next: (videos) => {
        this.videos.set(videos);
        done();
      },
      error: () => {
        this.error.set(true);
        done();
      },
    });

    this.adminService.settings().subscribe({
      next: (settings) => {
        if (settings) this.applySettings(settings);
        done();
      },
      error: () => {
        this.error.set(true);
        done();
      },
    });
  }

  /** Stored settings override the config defaults; unknown ids are ignored. */
  private applySettings(settings: SiteSettings): void {
    if (settings.featuredPostIds) this.featuredPostIds.set(settings.featuredPostIds);
    if (settings.featuredVideoId !== undefined) this.featuredVideoId.set(settings.featuredVideoId);
    if (settings.heroBannerUrl !== undefined) {
      this.heroBannerUrl.set(settings.heroBannerUrl ?? '');
      if (settings.heroBannerUrl) {
        this.probeImageDimensions(settings.heroBannerUrl);
      }
    }
    if (settings.heroBannerAlt !== undefined) {
      this.heroBannerAlt.set(settings.heroBannerAlt ?? '');
    }
    if (settings.heroBannerShowOverlays !== undefined) {
      this.heroBannerShowOverlays.set(settings.heroBannerShowOverlays);
    }
    if (settings.heroBannerTitle !== undefined) {
      this.heroBannerTitle.set(settings.heroBannerTitle ?? 'اسلامی تعلیمات');
    }
    if (settings.heroBannerSubtitle !== undefined) {
      this.heroBannerSubtitle.set(settings.heroBannerSubtitle ?? 'قرآن و حدیث کی روشنی میں');
    }
    if (settings.heroBannerTagline !== undefined) {
      this.heroBannerTagline.set(
        settings.heroBannerTagline ?? 'Islamic Knowledge for a Better Life',
      );
    }
    if (settings.heroBannerQuote !== undefined) {
      this.heroBannerQuote.set(settings.heroBannerQuote ?? 'اللہ کی رضا ہمیشہ کامیابی کی کنجی ہے');
    }
    if (settings.heroBannerShowPills !== undefined) {
      this.heroBannerShowPills.set(settings.heroBannerShowPills);
    }
    if (settings.heroBannerPill1 !== undefined) {
      this.heroBannerPill1.set(settings.heroBannerPill1 ?? 'Quran');
    }
    if (settings.heroBannerPill2 !== undefined) {
      this.heroBannerPill2.set(settings.heroBannerPill2 ?? 'Hadith');
    }
    if (settings.heroBannerPill3 !== undefined) {
      this.heroBannerPill3.set(settings.heroBannerPill3 ?? 'Dua');
    }
    if (settings.heroBannerPill4 !== undefined) {
      this.heroBannerPill4.set(settings.heroBannerPill4 ?? 'Islamic Education');
    }

    if (settings.homeSections?.length) {
      const stored = new Map(settings.homeSections.map((section) => [section.id, section.enabled]));
      // Keep the canonical order from siteConfig so new sections still appear.
      this.sections.set(
        siteConfig.homeSections.map((section) => ({
          id: section.id,
          enabled: stored.get(section.id) ?? section.enabled,
        })),
      );
    }
  }
}
