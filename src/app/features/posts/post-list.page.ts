import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Category, POST_TYPES, Post, PostType } from '../../core/models';
import { CategoryService } from '../../core/services/category.service';
import { PostService } from '../../core/services/post.service';
import { I18nService, TranslationKey } from '../../i18n/i18n.service';
import { ContentStateComponent } from '../../shared/components/content-state';
import { IconComponent } from '../../shared/components/icon/icon';
import { PostCard } from '../../shared/components/post-card';

/** How many posts one page reveals at a time — deliberately small on mobile. */
const PAGE_SIZE = 12;
/** Upper bound for a single filtered query; enough for the whole archive view. */
const QUERY_LIMIT = 60;

/**
 * Public post list (§20).
 *
 * Type and category filters run as real Firestore queries rather than hiding
 * already-loaded rows, and both option lists come from data (`POST_TYPES` and
 * the categories collection) — adding a topic or a post type never means
 * editing this template (§15).
 */
@Component({
  selector: 'app-post-list-page',
  standalone: true,
  imports: [IconComponent, PostCard, ContentStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './post-list.page.html',
  styleUrl: './post-list.page.scss',
})
export class PostListPage {
  readonly i18n = inject(I18nService);
  private readonly postService = inject(PostService);
  private readonly categoryService = inject(CategoryService);
  private readonly route = inject(ActivatedRoute);

  readonly loading = signal(true);
  readonly error = signal(false);
  readonly posts = signal<Post[]>([]);
  readonly categories = signal<Category[]>([]);

  readonly selectedType = signal<PostType | null>(
    (this.route.snapshot.queryParamMap.get('type') ?? null) as PostType | null,
  );
  readonly selectedCategory = signal<string | null>(
    this.route.snapshot.queryParamMap.get('category'),
  );
  readonly visibleCount = signal(PAGE_SIZE);

  /** "All types" plus every declared type — labels track the active language. */
  readonly typeOptions = computed(() => [
    { value: null as PostType | null, label: this.i18n.t('posts.allTypes') },
    ...POST_TYPES.map((value) => ({
      value,
      label: this.i18n.t(`posts.type.${value}` as TranslationKey),
    })),
  ]);

  readonly visiblePosts = computed(() => this.posts().slice(0, this.visibleCount()));
  readonly hasMore = computed(() => this.visiblePosts().length < this.posts().length);
  readonly resultCount = computed(() => this.posts().length);

  private subscription: { unsubscribe(): void } | null = null;

  constructor() {
    this.categoryService.listActive().subscribe({
      next: (categories) => this.categories.set(categories),
      error: () => this.categories.set([]),
    });
    this.load();
  }

  setType(type: PostType | null): void {
    this.selectedType.set(type);
    this.visibleCount.set(PAGE_SIZE);
    this.load();
  }

  setCategory(categoryId: string | null): void {
    this.selectedCategory.set(categoryId);
    this.visibleCount.set(PAGE_SIZE);
    this.load();
  }

  showMore(): void {
    this.visibleCount.update((count) => count + PAGE_SIZE);
  }

  retry(): void {
    this.load();
  }

  private load(): void {
    this.subscription?.unsubscribe();
    this.loading.set(true);
    this.error.set(false);

    this.subscription = this.postService
      .listPublished({
        type: this.selectedType(),
        categoryId: this.selectedCategory(),
        max: QUERY_LIMIT,
      })
      .subscribe({
        next: (posts) => {
          this.posts.set(posts);
          this.loading.set(false);
        },
        error: (err) => {
          console.error('Post list load error:', err);
          this.error.set(true);
          this.loading.set(false);
        },
      });
  }
}
