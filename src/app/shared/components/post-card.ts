import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Post } from '../../core/models';
import { I18nService, TranslationKey } from '../../i18n/i18n.service';
import { AppDatePipe } from '../pipes/app-date.pipe';
import { IconComponent } from './icon/icon';

/**
 * Post preview card (§53).
 *
 * Title and description resolve through `I18nService.localized()`, so the card
 * follows the active language with English fallback — never a raw key (§5).
 */
@Component({
  selector: 'app-post-card',
  standalone: true,
  imports: [RouterLink, IconComponent, AppDatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="card card--interactive post-card">
      @if (post().coverImage) {
        <a class="card__media" [routerLink]="['/posts', post().id]" [attr.aria-label]="title()">
          <img [src]="post().coverImage" [alt]="title()" loading="lazy" />
        </a>
      }
      <div class="card__body">
        <div class="card__meta">
          <span class="badge">{{ typeLabel() }}</span>
          @if (post().publishedAt; as published) {
            <span class="post-card__date">
              <app-icon name="calendar" />
              {{ published | appDate }}
            </span>
          }
        </div>
        <h3 class="card__title">
          <a [routerLink]="['/posts', post().id]">{{ title() }}</a>
        </h3>
        @if (description(); as text) {
          <p class="post-card__excerpt">{{ text }}</p>
        }
        <div class="card__actions">
          <a class="btn btn--ghost btn--sm" [routerLink]="['/posts', post().id]">
            {{ i18n.t('common.readMore') }}
            <app-icon name="arrow-right" />
          </a>
        </div>
      </div>
    </article>
  `,
  styleUrl: './post-card.scss',
})
export class PostCard {
  readonly i18n = inject(I18nService);

  readonly post = input.required<Post>();

  readonly title = computed(
    () => this.i18n.localized(this.post().title) || this.i18n.t('common.untitled'),
  );
  readonly description = computed(() => this.i18n.localized(this.post().description));
  readonly typeLabel = computed(() =>
    this.i18n.t(`posts.type.${this.post().type}` as TranslationKey),
  );
}
