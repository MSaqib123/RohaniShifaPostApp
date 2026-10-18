import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Category } from '../../core/models';
import { CategoryService } from '../../core/services/category.service';
import { I18nService } from '../../i18n/i18n.service';
import { CategoryCard } from '../../shared/components/category-card';
import { ContentStateComponent } from '../../shared/components/content-state';

/**
 * All dynamic categories (§15).
 *
 * The list is whatever administrators have created — there is no hard-coded
 * topic taxonomy anywhere in the app.
 */
@Component({
  selector: 'app-category-list-page',
  standalone: true,
  imports: [CategoryCard, ContentStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './category-list.page.html',
})
export class CategoryListPage {
  readonly i18n = inject(I18nService);
  private readonly categoryService = inject(CategoryService);

  readonly loading = signal(true);
  readonly error = signal(false);
  readonly categories = signal<Category[]>([]);

  constructor() {
    this.load();
  }

  retry(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.categoryService.listActive().subscribe({
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
