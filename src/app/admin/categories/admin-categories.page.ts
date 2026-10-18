import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Category, CategoryDraft } from '../../core/models';
import { LocalizedText } from '../../i18n/language.types';
import { CategoryService } from '../../core/services/category.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { ToastService } from '../../core/services/toast.service';
import { I18nService } from '../../i18n/i18n.service';
import { ContentStateComponent } from '../../shared/components/content-state';
import { IconComponent } from '../../shared/components/icon/icon';
import { LocalizedInput } from '../../shared/components/localized-input';

type TextField = 'slug' | 'icon' | 'imageUrl';

/** Editable category state — mirrors `CategoryDraft` minus server fields. */
interface CategoryEditor {
  id: string | null;
  name: LocalizedText;
  slug: string;
  description: LocalizedText;
  icon: string;
  imageUrl: string;
  sortOrder: number;
  isActive: boolean;
}

const emptyText = (): LocalizedText => ({ en: '' });

const blankEditor = (): CategoryEditor => ({
  id: null,
  name: emptyText(),
  slug: '',
  description: emptyText(),
  icon: '',
  imageUrl: '',
  sortOrder: 100,
  isActive: true,
});

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/**
 * Dynamic category management (§15).
 *
 * There is no hard-coded topic list anywhere in the app — categories are
 * created here, and turning one off (`isActive`) instantly removes it from
 * every public filter without touching the content that references it.
 * The editor opens inline so the list stays in view while you work.
 */
@Component({
  selector: 'app-admin-categories-page',
  standalone: true,
  imports: [IconComponent, ContentStateComponent, LocalizedInput],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-categories.page.html',
  styleUrl: './admin-categories.page.scss',
})
export class AdminCategoriesPage {
  readonly i18n = inject(I18nService);
  private readonly categoryService = inject(CategoryService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly error = signal(false);
  readonly categories = signal<Category[]>([]);
  readonly searchTerm = signal('');
  /** `null` closes the editor; otherwise create (`id: null`) or edit. */
  readonly editor = signal<CategoryEditor | null>(null);
  readonly saving = signal(false);
  readonly formError = signal('');

  readonly isNew = computed(() => this.editor()?.id === null);

  readonly filtered = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    if (!term) return this.categories();
    return this.categories().filter((category) => {
      const haystack = [
        this.i18n.localized(category.name),
        this.i18n.localized(category.description ?? ''),
        category.slug,
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(term);
    });
  });

  constructor() {
    this.load();
  }

  nameOf(category: Category): string {
    return this.i18n.localized(category.name) || this.i18n.t('common.untitled');
  }

  onSearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  retry(): void {
    this.load();
  }

  // ── Editor ────────────────────────────────────────────────────────────────

  startNew(): void {
    this.formError.set('');
    this.editor.set(blankEditor());
  }

  startEdit(category: Category): void {
    this.formError.set('');
    this.editor.set({
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description ?? emptyText(),
      icon: category.icon ?? '',
      imageUrl: category.imageUrl ?? '',
      sortOrder: category.sortOrder,
      isActive: category.isActive,
    });
  }

  cancelEdit(): void {
    this.editor.set(null);
    this.formError.set('');
  }

  patchEditor(partial: Partial<CategoryEditor>): void {
    this.editor.update((current) => {
      if (!current) return current;
      const next: CategoryEditor = { ...current, ...partial };
      // Offer a slug derived from the English name until one is typed.
      if (partial.name && !current.slug) {
        next.slug = slugify(partial.name.en ?? '');
      }
      return next;
    });
  }

  setText(field: TextField, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.editor.update((current) => {
      if (!current) return current;
      switch (field) {
        case 'slug':
          return { ...current, slug: value };
        case 'icon':
          return { ...current, icon: value };
        case 'imageUrl':
          return { ...current, imageUrl: value };
      }
    });
  }

  setSortOrder(event: Event): void {
    const parsed = Number((event.target as HTMLInputElement).value);
    this.patchEditor({ sortOrder: Number.isFinite(parsed) ? parsed : 0 });
  }

  setBool(event: Event): void {
    this.patchEditor({ isActive: (event.target as HTMLInputElement).checked });
  }

  onSubmit(event: Event): void {
    event.preventDefault();
    void this.save();
  }

  async save(): Promise<void> {
    const editor = this.editor();
    if (!editor) return;
    if (!editor.name.en?.trim()) {
      this.formError.set(this.i18n.t('admin.categoryForm.requiredName'));
      return;
    }

    this.saving.set(true);
    this.formError.set('');

    const draft: CategoryDraft = {
      name: this.compact(editor.name),
      slug: editor.slug.trim() || slugify(editor.name.en ?? ''),
      description: this.hasText(editor.description) ? this.compact(editor.description) : undefined,
      icon: editor.icon.trim() || undefined,
      imageUrl: editor.imageUrl.trim() || undefined,
      isActive: editor.isActive,
      sortOrder: editor.sortOrder,
    };

    try {
      if (editor.id) {
        await this.categoryService.update(editor.id, draft);
        this.toast.success(this.i18n.t('admin.categoryForm.updated'));
      } else {
        await this.categoryService.create(draft);
        this.toast.success(this.i18n.t('admin.categoryForm.created'));
      }
      this.editor.set(null);
      this.load();
    } catch (err: unknown) {
      console.error('Category save failed:', err);
      const message = err instanceof Error ? err.message : this.i18n.t('common.errorMessage');
      this.formError.set(message);
    } finally {
      this.saving.set(false);
    }
  }

  // ── Row actions ───────────────────────────────────────────────────────────

  async remove(category: Category): Promise<void> {
    const confirmed = await this.confirm.confirm({
      title: this.i18n.t('admin.confirmedDeleteTitle', { title: this.nameOf(category) }),
      message: this.i18n.t('admin.categoryForm.deleteTitle'),
      confirmLabel: this.i18n.t('common.delete'),
      danger: true,
    });
    if (!confirmed) return;

    try {
      await this.categoryService.remove(category.id);
      this.categories.update((items) => items.filter((item) => item.id !== category.id));
      if (this.editor()?.id === category.id) this.editor.set(null);
      this.toast.success(this.i18n.t('admin.categoryForm.deleted'));
    } catch {
      this.toast.error(this.i18n.t('common.errorMessage'));
    }
  }

  private compact(value: LocalizedText): LocalizedText {
    const result: LocalizedText = { en: value.en ?? '' };
    if (value.ur?.trim()) result.ur = value.ur;
    if (value.ar?.trim()) result.ar = value.ar;
    return result;
  }

  /** True when at least one language carries text. */
  private hasText(value: LocalizedText): boolean {
    return Boolean(value.en?.trim() || value.ur?.trim() || value.ar?.trim());
  }

  private load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.categoryService.listAll().subscribe({
      next: (categories) => {
        this.categories.set(categories);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }
}
