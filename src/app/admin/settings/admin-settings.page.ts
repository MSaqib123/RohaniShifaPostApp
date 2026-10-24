import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Post, SiteSettings, Video } from '../../core/models';
import { AdminService } from '../../core/services/admin.service';
import { PostService } from '../../core/services/post.service';
import { VideoService } from '../../core/services/video.service';
import { ToastService } from '../../core/services/toast.service';
import { I18nService, TranslationKey } from '../../i18n/i18n.service';
import { LocalizedText, SupportedLanguage } from '../../i18n/language.types';
import { siteConfig } from '../../config/site.config';
import { ContentStateComponent } from '../../shared/components/content-state';
import { IconComponent } from '../../shared/components/icon/icon';
import { DEFAULT_BANNER_OVERLAYS } from '../../features/home/home.page';

function parseLocalizedField(
  val: unknown,
  fallback: Record<'en' | 'ur' | 'ar', string>,
): LocalizedText {
  if (!val) return { ...fallback };
  if (typeof val === 'string') {
    return { en: fallback.en, ur: val, ar: fallback.ar };
  }
  if (typeof val === 'object') {
    const o = val as Record<string, string>;
    return {
      en: o['en'] ?? fallback.en,
      ur: o['ur'] ?? fallback.ur,
      ar: o['ar'] ?? fallback.ar,
    };
  }
  return { ...fallback };
}

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

  /** 5 Banner picture slots available for admin to upload & toggle */
  readonly bannerSlots = signal<string[]>([
    'images/hero-banner.jpg',
    'images/islamic-hero.png',
    '',
    '',
    '',
  ]);
  readonly activeBannerSlotIndex = signal<number>(0);

  /** Currently selected language tab for editing the overlay fields */
  readonly overlayEditingLang = signal<SupportedLanguage>('ur');

  readonly heroBannerTitle = signal<LocalizedText>({
    ur: DEFAULT_BANNER_OVERLAYS.title.ur,
    en: DEFAULT_BANNER_OVERLAYS.title.en,
    ar: DEFAULT_BANNER_OVERLAYS.title.ar,
  });
  readonly heroBannerSubtitle = signal<LocalizedText>({
    ur: DEFAULT_BANNER_OVERLAYS.subtitle.ur,
    en: DEFAULT_BANNER_OVERLAYS.subtitle.en,
    ar: DEFAULT_BANNER_OVERLAYS.subtitle.ar,
  });
  readonly heroBannerTagline = signal<LocalizedText>({
    ur: DEFAULT_BANNER_OVERLAYS.tagline.ur,
    en: DEFAULT_BANNER_OVERLAYS.tagline.en,
    ar: DEFAULT_BANNER_OVERLAYS.tagline.ar,
  });
  readonly heroBannerQuote = signal<LocalizedText>({
    ur: DEFAULT_BANNER_OVERLAYS.quote.ur,
    en: DEFAULT_BANNER_OVERLAYS.quote.en,
    ar: DEFAULT_BANNER_OVERLAYS.quote.ar,
  });
  readonly heroBannerShowPills = signal<boolean>(true);
  readonly heroBannerPill1 = signal<LocalizedText>({
    ur: DEFAULT_BANNER_OVERLAYS.pill1.ur,
    en: DEFAULT_BANNER_OVERLAYS.pill1.en,
    ar: DEFAULT_BANNER_OVERLAYS.pill1.ar,
  });
  readonly heroBannerPill2 = signal<LocalizedText>({
    ur: DEFAULT_BANNER_OVERLAYS.pill2.ur,
    en: DEFAULT_BANNER_OVERLAYS.pill2.en,
    ar: DEFAULT_BANNER_OVERLAYS.pill2.ar,
  });
  readonly heroBannerPill3 = signal<LocalizedText>({
    ur: DEFAULT_BANNER_OVERLAYS.pill3.ur,
    en: DEFAULT_BANNER_OVERLAYS.pill3.en,
    ar: DEFAULT_BANNER_OVERLAYS.pill3.ar,
  });
  readonly heroBannerPill4 = signal<LocalizedText>({
    ur: DEFAULT_BANNER_OVERLAYS.pill4.ur,
    en: DEFAULT_BANNER_OVERLAYS.pill4.en,
    ar: DEFAULT_BANNER_OVERLAYS.pill4.ar,
  });
  readonly bannerDimensions = signal<{ width: number; height: number; sizeStr: string } | null>(
    null,
  );
  readonly isDragging = signal<boolean>(false);

  readonly languages = siteConfig.languages;

  readonly previewTitle = computed(() => {
    const lang = this.overlayEditingLang();
    return this.heroBannerTitle()[lang] || this.heroBannerTitle()['ur'] || '';
  });
  readonly previewSubtitle = computed(() => {
    const lang = this.overlayEditingLang();
    return this.heroBannerSubtitle()[lang] || this.heroBannerSubtitle()['ur'] || '';
  });
  readonly previewTagline = computed(() => {
    const lang = this.overlayEditingLang();
    return this.heroBannerTagline()[lang] || this.heroBannerTagline()['en'] || '';
  });
  readonly previewQuote = computed(() => {
    const lang = this.overlayEditingLang();
    return this.heroBannerQuote()[lang] || this.heroBannerQuote()['ur'] || '';
  });
  readonly previewPill1 = computed(() => {
    const lang = this.overlayEditingLang();
    return this.heroBannerPill1()[lang] || this.heroBannerPill1()['en'] || '';
  });
  readonly previewPill2 = computed(() => {
    const lang = this.overlayEditingLang();
    return this.heroBannerPill2()[lang] || this.heroBannerPill2()['en'] || '';
  });
  readonly previewPill3 = computed(() => {
    const lang = this.overlayEditingLang();
    return this.heroBannerPill3()[lang] || this.heroBannerPill3()['en'] || '';
  });
  readonly previewPill4 = computed(() => {
    const lang = this.overlayEditingLang();
    return this.heroBannerPill4()[lang] || this.heroBannerPill4()['en'] || '';
  });

  readonly currentBannerPreview = computed(() => {
    const activeSlotImg = this.bannerSlots()[this.activeBannerSlotIndex()];
    if (activeSlotImg && activeSlotImg.trim()) return activeSlotImg.trim();
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
    this.bannerSlots.update((slots) => {
      const next = [...slots];
      next[this.activeBannerSlotIndex()] = value;
      return next;
    });
    if (value.trim()) {
      this.probeImageDimensions(value.trim());
    } else {
      this.bannerDimensions.set(null);
    }
  }

  selectActiveBannerSlot(index: number): void {
    this.activeBannerSlotIndex.set(index);
    const chosen = this.bannerSlots()[index];
    if (chosen) {
      this.heroBannerUrl.set(chosen);
      this.probeImageDimensions(chosen);
    }
    this.toast.success(`${this.i18n.t('admin.settings.slotActive')}: #${index + 1}`);
  }

  onSlotFileSelected(slotIndex: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (files && files.length > 0) {
      void this.processSlotFile(slotIndex, files[0]);
    }
    input.value = '';
  }

  private async processSlotFile(slotIndex: number, file: File): Promise<void> {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      this.toast.error(this.i18n.t('admin.settings.invalidImage'));
      return;
    }

    try {
      const result = await this.compressImageFile(file, 1200, 750, 0.75);
      this.bannerSlots.update((slots) => {
        const next = [...slots];
        next[slotIndex] = result.url;
        return next;
      });
      if (this.activeBannerSlotIndex() === slotIndex || !this.heroBannerUrl()) {
        this.heroBannerUrl.set(result.url);
        this.activeBannerSlotIndex.set(slotIndex);
        this.bannerDimensions.set({
          width: result.width,
          height: result.height,
          sizeStr: result.sizeStr,
        });
      }
      this.toast.success(
        `${this.i18n.t('admin.settings.bannerUploaded')} (#${slotIndex + 1} • ${result.sizeStr})`,
      );
    } catch {
      this.toast.error(this.i18n.t('admin.settings.invalidImage'));
    }
  }

  private compressImageFile(
    file: File,
    maxW = 1200,
    maxH = 750,
    quality = 0.75,
  ): Promise<{ url: string; width: number; height: number; sizeStr: string }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('File reading failed'));
      reader.onload = () => {
        const rawData = reader.result as string;
        const img = new Image();
        img.onerror = () => reject(new Error('Invalid image data'));
        img.onload = () => {
          let w = img.naturalWidth;
          let h = img.naturalHeight;
          if (w > maxW || h > maxH) {
            const ratio = Math.min(maxW / w, maxH / h);
            w = Math.round(w * ratio);
            h = Math.round(h * ratio);
          }
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas unavailable'));
            return;
          }
          ctx.drawImage(img, 0, 0, w, h);
          const compressed = canvas.toDataURL('image/jpeg', quality);
          const bytes = Math.round((compressed.length * 3) / 4);
          const sizeStr = `${Math.round(bytes / 1024)} KB`;
          resolve({
            url: compressed,
            width: w,
            height: h,
            sizeStr,
          });
        };
        img.src = rawData;
      };
      reader.readAsDataURL(file);
    });
  }

  private recompressDataUrl(
    dataUrl: string,
    maxW = 1200,
    maxH = 750,
    quality = 0.70,
  ): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        let w = img.naturalWidth;
        let h = img.naturalHeight;
        if (w > maxW || h > maxH) {
          const ratio = Math.min(maxW / w, maxH / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', quality));
          return;
        }
        resolve(dataUrl);
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  }

  clearBannerSlot(slotIndex: number, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.bannerSlots.update((slots) => {
      const next = [...slots];
      next[slotIndex] = '';
      return next;
    });
    if (this.activeBannerSlotIndex() === slotIndex) {
      const remainingIdx = this.bannerSlots().findIndex((s) => !!s);
      const fallbackIdx = remainingIdx >= 0 ? remainingIdx : 0;
      this.activeBannerSlotIndex.set(fallbackIdx);
      const fallbackUrl = this.bannerSlots()[fallbackIdx] || 'images/hero-banner.jpg';
      this.heroBannerUrl.set(fallbackUrl);
      this.probeImageDimensions(fallbackUrl);
    }
  }

  resetDefaultBanner(): void {
    this.bannerSlots.set([
      'images/hero-banner.jpg',
      'images/islamic-hero.png',
      '',
      '',
      '',
    ]);
    this.activeBannerSlotIndex.set(0);
    this.heroBannerUrl.set('images/hero-banner.jpg');
    this.heroBannerAlt.set('');
    this.bannerDimensions.set(null);
    this.heroBannerShowOverlays.set(true);
    this.heroBannerShowPills.set(true);
    this.heroBannerTitle.set({ ...DEFAULT_BANNER_OVERLAYS.title });
    this.heroBannerSubtitle.set({ ...DEFAULT_BANNER_OVERLAYS.subtitle });
    this.heroBannerTagline.set({ ...DEFAULT_BANNER_OVERLAYS.tagline });
    this.heroBannerQuote.set({ ...DEFAULT_BANNER_OVERLAYS.quote });
    this.heroBannerPill1.set({ ...DEFAULT_BANNER_OVERLAYS.pill1 });
    this.heroBannerPill2.set({ ...DEFAULT_BANNER_OVERLAYS.pill2 });
    this.heroBannerPill3.set({ ...DEFAULT_BANNER_OVERLAYS.pill3 });
    this.heroBannerPill4.set({ ...DEFAULT_BANNER_OVERLAYS.pill4 });
  }

  onBannerAltChange(event: Event): void {
    this.heroBannerAlt.set((event.target as HTMLInputElement).value);
  }

  onBannerShowOverlaysToggle(event: Event): void {
    this.heroBannerShowOverlays.set((event.target as HTMLInputElement).checked);
  }

  onBannerShowPillsToggle(event: Event): void {
    this.heroBannerShowPills.set((event.target as HTMLInputElement).checked);
  }

  setOverlayEditingLang(lang: SupportedLanguage): void {
    this.overlayEditingLang.set(lang);
  }

  getOverlayVal(
    field:
      | 'title'
      | 'subtitle'
      | 'tagline'
      | 'quote'
      | 'pill1'
      | 'pill2'
      | 'pill3'
      | 'pill4',
  ): string {
    const lang = this.overlayEditingLang();
    switch (field) {
      case 'title':
        return this.heroBannerTitle()[lang] ?? '';
      case 'subtitle':
        return this.heroBannerSubtitle()[lang] ?? '';
      case 'tagline':
        return this.heroBannerTagline()[lang] ?? '';
      case 'quote':
        return this.heroBannerQuote()[lang] ?? '';
      case 'pill1':
        return this.heroBannerPill1()[lang] ?? '';
      case 'pill2':
        return this.heroBannerPill2()[lang] ?? '';
      case 'pill3':
        return this.heroBannerPill3()[lang] ?? '';
      case 'pill4':
        return this.heroBannerPill4()[lang] ?? '';
    }
  }

  setOverlayVal(
    field:
      | 'title'
      | 'subtitle'
      | 'tagline'
      | 'quote'
      | 'pill1'
      | 'pill2'
      | 'pill3'
      | 'pill4',
    event: Event,
  ): void {
    const val = (event.target as HTMLInputElement).value;
    const lang = this.overlayEditingLang();
    switch (field) {
      case 'title':
        this.heroBannerTitle.update((prev) => ({ ...prev, [lang]: val }));
        break;
      case 'subtitle':
        this.heroBannerSubtitle.update((prev) => ({ ...prev, [lang]: val }));
        break;
      case 'tagline':
        this.heroBannerTagline.update((prev) => ({ ...prev, [lang]: val }));
        break;
      case 'quote':
        this.heroBannerQuote.update((prev) => ({ ...prev, [lang]: val }));
        break;
      case 'pill1':
        this.heroBannerPill1.update((prev) => ({ ...prev, [lang]: val }));
        break;
      case 'pill2':
        this.heroBannerPill2.update((prev) => ({ ...prev, [lang]: val }));
        break;
      case 'pill3':
        this.heroBannerPill3.update((prev) => ({ ...prev, [lang]: val }));
        break;
      case 'pill4':
        this.heroBannerPill4.update((prev) => ({ ...prev, [lang]: val }));
        break;
    }
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

    try {
      const result = await this.compressImageFile(file, 1200, 750, 0.75);
      this.heroBannerUrl.set(result.url);
      this.bannerSlots.update((slots) => {
        const next = [...slots];
        next[this.activeBannerSlotIndex()] = result.url;
        return next;
      });
      this.bannerDimensions.set({
        width: result.width,
        height: result.height,
        sizeStr: result.sizeStr,
      });
      this.toast.success(
        `${this.i18n.t('admin.settings.bannerUploaded')} (${result.sizeStr})`,
      );
    } catch {
      this.toast.error(this.i18n.t('admin.settings.invalidImage'));
    }
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
    try {
      // Recompress any oversized data URLs before saving to keep total payload safely <450KB
      const sanitizedSlots = await Promise.all(
        this.bannerSlots().map(async (slot) => {
          if (!slot || !slot.startsWith('data:image')) return slot;
          if (slot.length < 120_000) return slot;
          return this.recompressDataUrl(slot, 1200, 750, 0.70);
        }),
      );
      this.bannerSlots.set(sanitizedSlots);

      const activeUrl =
        sanitizedSlots[this.activeBannerSlotIndex()] ||
        this.heroBannerUrl().trim() ||
        null;

      const patch: SiteSettings = {
        featuredPostIds: this.featuredPostIds(),
        featuredVideoId: this.featuredVideoId(),
        homeSections: this.sections(),
        heroBannerUrl: activeUrl,
        heroBannerAlt: this.heroBannerAlt().trim() || null,
        heroBannerImages: sanitizedSlots,
        heroBannerActiveIndex: this.activeBannerSlotIndex(),
        heroBannerShowOverlays: this.heroBannerShowOverlays(),
        heroBannerTitle: this.heroBannerTitle(),
        heroBannerSubtitle: this.heroBannerSubtitle(),
        heroBannerTagline: this.heroBannerTagline(),
        heroBannerQuote: this.heroBannerQuote(),
        heroBannerShowPills: this.heroBannerShowPills(),
        heroBannerPill1: this.heroBannerPill1(),
        heroBannerPill2: this.heroBannerPill2(),
        heroBannerPill3: this.heroBannerPill3(),
        heroBannerPill4: this.heroBannerPill4(),
      };

      await this.adminService.saveSettings(patch);
      this.toast.success(this.i18n.t('admin.settings.saved'));
    } catch (err: unknown) {
      console.error('Failed to save settings:', err);
      const msg = err instanceof Error ? err.message : this.i18n.t('common.errorMessage');
      this.toast.error(msg);
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
    if (
      settings.heroBannerImages &&
      Array.isArray(settings.heroBannerImages) &&
      settings.heroBannerImages.length > 0
    ) {
      const padded = [...settings.heroBannerImages];
      while (padded.length < 5) padded.push('');
      this.bannerSlots.set(padded.slice(0, 5));
    } else {
      const defaultUrl = settings.heroBannerUrl || 'images/hero-banner.jpg';
      this.bannerSlots.set([defaultUrl, 'images/islamic-hero.png', '', '', '']);
    }
    if (
      settings.heroBannerActiveIndex !== undefined &&
      settings.heroBannerActiveIndex >= 0 &&
      settings.heroBannerActiveIndex < 5
    ) {
      this.activeBannerSlotIndex.set(settings.heroBannerActiveIndex);
    }
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
      this.heroBannerTitle.set(
        parseLocalizedField(settings.heroBannerTitle, DEFAULT_BANNER_OVERLAYS.title),
      );
    }
    if (settings.heroBannerSubtitle !== undefined) {
      this.heroBannerSubtitle.set(
        parseLocalizedField(settings.heroBannerSubtitle, DEFAULT_BANNER_OVERLAYS.subtitle),
      );
    }
    if (settings.heroBannerTagline !== undefined) {
      this.heroBannerTagline.set(
        parseLocalizedField(settings.heroBannerTagline, DEFAULT_BANNER_OVERLAYS.tagline),
      );
    }
    if (settings.heroBannerQuote !== undefined) {
      this.heroBannerQuote.set(
        parseLocalizedField(settings.heroBannerQuote, DEFAULT_BANNER_OVERLAYS.quote),
      );
    }
    if (settings.heroBannerShowPills !== undefined) {
      this.heroBannerShowPills.set(settings.heroBannerShowPills);
    }
    if (settings.heroBannerPill1 !== undefined) {
      this.heroBannerPill1.set(
        parseLocalizedField(settings.heroBannerPill1, DEFAULT_BANNER_OVERLAYS.pill1),
      );
    }
    if (settings.heroBannerPill2 !== undefined) {
      this.heroBannerPill2.set(
        parseLocalizedField(settings.heroBannerPill2, DEFAULT_BANNER_OVERLAYS.pill2),
      );
    }
    if (settings.heroBannerPill3 !== undefined) {
      this.heroBannerPill3.set(
        parseLocalizedField(settings.heroBannerPill3, DEFAULT_BANNER_OVERLAYS.pill3),
      );
    }
    if (settings.heroBannerPill4 !== undefined) {
      this.heroBannerPill4.set(
        parseLocalizedField(settings.heroBannerPill4, DEFAULT_BANNER_OVERLAYS.pill4),
      );
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
