import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Category } from '../../core/models';
import { I18nService } from '../../i18n/i18n.service';
import { IconComponent } from './icon/icon';

/**
 * Category tile (§15).
 *
 * Fully data-driven: name, icon and slug all come from the Firestore
 * document, so an admin can invent a topic without touching this component.
 * Falls back to a neutral icon when the category declares an unknown key.
 */
@Component({
  selector: 'app-category-card',
  standalone: true,
  imports: [RouterLink, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a class="card card--interactive category-card" [routerLink]="['/categories', category().slug]">
      <div class="card__body">
        <span class="category-card__icon" aria-hidden="true">
          <app-icon [name]="icon()" />
        </span>
        <h3 class="category-card__title">{{ name() }}</h3>
        @if (description(); as text) {
          <p class="category-card__text">{{ text }}</p>
        }
        <span class="category-card__cta">
          {{ i18n.t('categories.viewCategory') }}
          <app-icon name="arrow-right" />
        </span>
      </div>
    </a>
  `,
  styleUrl: './category-card.scss',
})
export class CategoryCard {
  readonly i18n = inject(I18nService);

  readonly category = input.required<Category>();

  readonly name = computed(() => this.i18n.localized(this.category().name) || this.category().slug);
  readonly description = computed(() => this.i18n.localized(this.category().description));
  readonly icon = computed(() => this.category().icon || 'grid');
}
