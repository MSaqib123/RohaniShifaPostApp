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
