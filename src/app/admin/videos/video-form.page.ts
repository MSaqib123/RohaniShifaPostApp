import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Timestamp } from 'firebase/firestore';
import { Category, Video, VideoDraft } from '../../core/models';
import { LocalizedText } from '../../i18n/language.types';
import { AuthService } from '../../core/auth/auth.service';
import { CategoryService } from '../../core/services/category.service';
import { VideoService } from '../../core/services/video.service';
import { ToastService } from '../../core/services/toast.service';
import { I18nService } from '../../i18n/i18n.service';
import { parseYouTubeId, youtubeThumbnailUrl } from '../../core/services/youtube';
import { ContentStateComponent } from '../../shared/components/content-state';
import { IconComponent } from '../../shared/components/icon/icon';
import { LocalizedInput } from '../../shared/components/localized-input';

type TextField = 'youtubeUrl' | 'tags' | 'thumbnailUrl';

interface FormState {
  id: string | null;
  youtubeUrl: string;
  title: LocalizedText;
  description: LocalizedText;
  categoryIds: string[];
  tags: string;
  thumbnailUrl: string;
  featured: boolean;
  published: boolean;
}

const emptyText = (): LocalizedText => ({ en: '' });

const blankForm = (): FormState => ({
  id: null,
  youtubeUrl: '',
  title: emptyText(),
  description: emptyText(),
  categoryIds: [],
  tags: '',
  thumbnailUrl: '',
  featured: false,
  published: true,
});

/**
 * Create/edit video form (§13, §22).
 *
 * Only the YouTube reference is stored — media never enters Firebase Storage.
 * The preview renders the moment the parser recognises a valid id, so a broken
 * link is caught before it is ever saved (§61).
 */
@Component({
  selector: 'app-video-form-page',
  standalone: true,
  imports: [RouterLink, IconComponent, ContentStateComponent, LocalizedInput],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './video-form.page.html',
  styleUrl: './video-form.page.scss',
})
export class VideoFormPage {
  readonly i18n = inject(I18nService);
  private readonly videoService = inject(VideoService);
  private readonly categoryService = inject(CategoryService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly form = signal<FormState>(blankForm());
  readonly saving = signal(false);
  readonly loading = signal(true);
  readonly loadError = signal(false);
  readonly error = signal('');
  readonly categories = signal<Category[]>([]);

  readonly isNew = computed(() => this.form().id === null);

  /** Parsed as you type — drives the preview and the save-time validation. */
  readonly previewId = computed(() => parseYouTubeId(this.form().youtubeUrl));
  readonly previewThumb = computed(() => {
    const id = this.previewId();
    return id ? youtubeThumbnailUrl(id) : null;
  });

  private existingPublishedAt: Timestamp | null = null;
  private readonly id = this.route.snapshot.paramMap.get('id');

  constructor() {
    this.categoryService.listActive().subscribe({
      next: (categories) => this.categories.set(categories),
      error: () => this.categories.set([]),
    });
    this.load();
  }

  titleOf(video: Video): string {
    return this.i18n.localized(video.title) || this.i18n.t('common.untitled');
  }

  setText(field: TextField, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.form.update((state) => ({ ...state, [field]: value }));
  }

  setBool(field: 'featured' | 'published', event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.form.update((state) => ({ ...state, [field]: checked }));
  }

  patch(partial: Partial<FormState>): void {
    this.form.update((state) => ({ ...state, ...partial }));
  }

  toggleCategory(categoryId: string): void {
    this.form.update((state) => ({
      ...state,
      categoryIds: state.categoryIds.includes(categoryId)
        ? state.categoryIds.filter((item) => item !== categoryId)
        : [...state.categoryIds, categoryId],
    }));
  }

  onSubmit(event: Event): void {
    event.preventDefault();
    void this.save();
  }

  retryLoad(): void {
    this.load();
  }

  async save(): Promise<void> {
    const state = this.form();
    if (!state.title.en?.trim()) {
      this.error.set(this.i18n.t('admin.postForm.requiredTitle'));
      return;
    }
    if (!this.previewId()) {
      this.error.set(this.i18n.t('admin.videoForm.invalidUrl'));
      return;
    }

    const authorId = this.auth.profile()?.uid ?? this.auth.user()?.uid ?? '';
    if (!state.id && !authorId) {
      this.error.set(this.i18n.t('common.loginRequiredMessage'));
      return;
    }

    this.saving.set(true);
    this.error.set('');

    const draft: VideoDraft & { youtubeUrl: string } = {
      title: this.compact(state.title),
      description: this.compact(state.description),
      categoryIds: state.categoryIds,
      thumbnailUrl: state.thumbnailUrl.trim() || undefined,
      status: state.published ? 'published' : 'draft',
      publishedAt: state.published ? (this.existingPublishedAt ?? Timestamp.now()) : null,
      featured: state.featured,
      relatedPostIds: [],
      relatedEventIds: [],
      tags: this.splitTags(state.tags),
      youtubeUrl: state.youtubeUrl.trim(),
    };

    try {
      if (state.id) {
        await this.videoService.update(state.id, draft);
        this.toast.success(this.i18n.t('admin.videoForm.updated'));
      } else {
        await this.videoService.create(authorId, draft);
        this.toast.success(this.i18n.t('admin.videoForm.created'));
      }
      void this.router.navigate(['/admin/videos']);
    } catch (err: unknown) {
      console.error('Video save failed:', err);
      const message = err instanceof Error ? err.message : this.i18n.t('common.errorMessage');
      this.error.set(message);
    } finally {
      this.saving.set(false);
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private load(): void {
    this.loading.set(true);
    this.loadError.set(false);

    if (!this.id) {
      this.loading.set(false);
      return;
    }

    this.videoService.get(this.id).subscribe({
      next: (video) => {
        if (video) {
          this.form.set(this.toForm(video));
        } else {
          this.loadError.set(true);
        }
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set(true);
        this.loading.set(false);
      },
    });
  }

  private toForm(video: Video): FormState {
    this.existingPublishedAt = video.publishedAt ?? null;
    return {
      id: video.id,
      youtubeUrl: video.youtubeUrl,
      title: video.title,
      description: video.description,
      categoryIds: video.categoryIds,
      tags: video.tags.join(', '),
      thumbnailUrl: video.thumbnailUrl ?? '',
      featured: video.featured,
      published: video.status === 'published',
    };
  }

  private compact(value: LocalizedText): LocalizedText {
    const result: LocalizedText = { en: value.en ?? '' };
    if (value.ur?.trim()) result.ur = value.ur;
    if (value.ar?.trim()) result.ar = value.ar;
    return result;
  }

  private splitTags(raw: string): string[] {
    return Array.from(
      new Set(
        raw
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
      ),
    );
  }
}
