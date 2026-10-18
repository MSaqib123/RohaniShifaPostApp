import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Timestamp } from 'firebase/firestore';
import { Category, Post, POST_TYPES, PostDraft, PostType, Video } from '../../core/models';
import { LocalizedText } from '../../i18n/language.types';
import { AuthService } from '../../core/auth/auth.service';
import { CategoryService } from '../../core/services/category.service';
import { PostService } from '../../core/services/post.service';
import { VideoService } from '../../core/services/video.service';
import { ToastService } from '../../core/services/toast.service';
import { I18nService, TranslationKey } from '../../i18n/i18n.service';
import { ContentStateComponent } from '../../shared/components/content-state';
import { IconComponent } from '../../shared/components/icon/icon';
import { LocalizedInput } from '../../shared/components/localized-input';

/** Plain (non-localised) string fields edited through one `setText` handler. */
type TextField =
  | 'slug'
  | 'coverImage'
  | 'tags'
  | 'source'
  | 'reference'
  | 'scholar'
  | 'book'
  | 'chapter'
  | 'hadithNumber';

const emptyText = (): LocalizedText => ({ en: '' });

/** Draft shape used by the form before conversion to `PostDraft`. */
interface FormState {
  id: string | null;
  title: LocalizedText;
  description: LocalizedText;
  content: LocalizedText;
  type: PostType;
  categoryIds: string[];
  tags: string;
  coverImage: string;
  slug: string;
  featured: boolean;
  published: boolean;
  source: string;
  reference: string;
  scholar: string;
  book: string;
  chapter: string;
  hadithNumber: string;
  relatedVideoIds: string[];
}

const blankForm = (): FormState => ({
  id: null,
  title: emptyText(),
  description: emptyText(),
  content: emptyText(),
  type: 'article',
  categoryIds: [],
  tags: '',
  coverImage: '',
  slug: '',
  featured: false,
  published: true,
  source: '',
  reference: '',
  scholar: '',
  book: '',
  chapter: '',
  hadithNumber: '',
  relatedVideoIds: [],
});

/** URL-safe slug; empty input stays empty (slug is optional metadata). */
function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/**
 * Create/edit post form (§22).
 *
 * Multilingual fields are edited per language with automatic English
 * fallback (§5), and the source block carries an explicit warning that
 * religious citations are recorded verbatim, never invented (§47).
 */
@Component({
  selector: 'app-post-form-page',
  standalone: true,
  imports: [RouterLink, IconComponent, ContentStateComponent, LocalizedInput],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './post-form.page.html',
  styleUrl: './post-form.page.scss',
})
export class PostFormPage {
  readonly i18n = inject(I18nService);
  private readonly postService = inject(PostService);
  private readonly videoService = inject(VideoService);
  private readonly categoryService = inject(CategoryService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly form = signal<FormState>(blankForm());
  readonly saving = signal(false);
  readonly loading = signal(true);
  /** Load failure (retry re-runs the fetch). */
  readonly loadError = signal(false);
  /** Validation / submission failure shown above the form. */
  readonly error = signal('');
  readonly categories = signal<Category[]>([]);
  readonly videos = signal<Video[]>([]);

  readonly isNew = computed(() => this.form().id === null);
  readonly typeOptions = POST_TYPES.map((value) => ({ value }));

  /** Retained from the loaded post so re-publishing keeps the original date. */
  private existingPublishedAt: Timestamp | null = null;
  private readonly id = this.route.snapshot.paramMap.get('id');

  constructor() {
    this.categoryService.listActive().subscribe({
      next: (categories) => this.categories.set(categories),
      error: () => this.categories.set([]),
    });
    this.videoService.listAll(100).subscribe({
      next: (videos) => this.videos.set(videos),
      error: () => this.videos.set([]),
    });
    this.load();
  }

  typeLabel(type: PostType): string {
    return this.i18n.t(`posts.type.${type}` as TranslationKey);
  }

  titleOf(item: Post): string {
    return this.i18n.localized(item.title) || this.i18n.t('common.untitled');
  }

  videoTitle(video: Video): string {
    return this.i18n.localized(video.title) || this.i18n.t('common.untitled');
  }

  setType(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as PostType;
    this.form.update((state) => ({ ...state, type: value }));
  }

  /** Single handler for every plain string field (§61 — no dead inputs). */
  setText(field: TextField, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.form.update((state) => ({ ...state, [field]: value }));
  }

  setBool(field: 'featured' | 'published', event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.form.update((state) => ({ ...state, [field]: checked }));
  }

  toggleCategory(id: string): void {
    this.form.update((state) => ({
      ...state,
      categoryIds: state.categoryIds.includes(id)
        ? state.categoryIds.filter((item) => item !== id)
        : [...state.categoryIds, id],
    }));
  }

  toggleVideo(id: string): void {
    this.form.update((state) => ({
      ...state,
      relatedVideoIds: state.relatedVideoIds.includes(id)
        ? state.relatedVideoIds.filter((item) => item !== id)
        : [...state.relatedVideoIds, id],
    }));
  }

  /**
   * Single patch entry point — every field edit flows through here so the
   * derived slug stays in step with the English title until it is edited.
   */
  patch(partial: Partial<FormState>): void {
    this.form.update((state) => {
      const next: FormState = { ...state, ...partial };
      if (partial.title && !state.slug) {
        next.slug = slugify(partial.title.en ?? '');
      }
      return next;
    });
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

    const authorId = this.auth.profile()?.uid ?? this.auth.user()?.uid ?? '';
    if (!state.id && !authorId) {
      this.error.set(this.i18n.t('common.loginRequiredMessage'));
      return;
    }

    this.saving.set(true);
    this.error.set('');

    const draft: PostDraft = {
      type: state.type,
      title: this.compact(state.title),
      description: this.compact(state.description),
      content: this.compact(state.content),
      categoryIds: state.categoryIds,
      status: state.published ? 'published' : 'draft',
      // First publication gets its timestamp; later saves keep the original.
      publishedAt: state.published ? (this.existingPublishedAt ?? Timestamp.now()) : null,
      featured: state.featured,
      coverImage: state.coverImage.trim() || undefined,
      slug: state.slug.trim() || slugify(state.title.en ?? '') || undefined,
      tags: this.splitTags(state.tags),
      relatedVideoIds: state.relatedVideoIds,
      relatedEventIds: [],
      source: state.source.trim() || undefined,
      reference: state.reference.trim() || undefined,
      scholar: state.scholar.trim() || undefined,
      book: state.book.trim() || undefined,
      chapter: state.chapter.trim() || undefined,
      hadithNumber: state.hadithNumber.trim() || undefined,
    };

    try {
      if (state.id) {
        await this.postService.update(state.id, draft);
        this.toast.success(this.i18n.t('admin.postForm.updated'));
      } else {
        await this.postService.create(authorId, draft);
        this.toast.success(this.i18n.t('admin.postForm.created'));
      }
      void this.router.navigate(['/admin/posts']);
    } catch (err: unknown) {
      console.error('Post save failed:', err);
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

    this.postService.get(this.id).subscribe({
      next: (post) => {
        if (post) {
          this.form.set(this.toForm(post));
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

  private toForm(post: Post): FormState {
    this.existingPublishedAt = post.publishedAt ?? null;
    return {
      id: post.id,
      title: post.title,
      description: post.description,
      content: post.content,
      type: post.type,
      categoryIds: post.categoryIds,
      tags: post.tags.join(', '),
      coverImage: post.coverImage ?? '',
      slug: post.slug ?? '',
      featured: post.featured,
      published: post.status === 'published',
      source: post.source ?? '',
      reference: post.reference ?? '',
      scholar: post.scholar ?? '',
      book: post.book ?? '',
      chapter: post.chapter ?? '',
      hadithNumber: post.hadithNumber ?? '',
      relatedVideoIds: post.relatedVideoIds,
    };
  }

  /** Drop empty languages so Firestore stores only what actually exists. */
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
