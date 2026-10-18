import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { siteConfig } from '../../config/site.config';
import { I18nService } from '../../i18n/i18n.service';
import { IconComponent } from '../../shared/components/icon/icon';

/**
 * About page (§59). Mission statement and contact details live in
 * `siteConfig` — official content drops in without code changes (§66/§70).
 */
@Component({
  selector: 'app-about-page',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="section container">
      <header class="section-head">
        <div class="section-head__titles">
          <span class="section-head__kicker">{{ i18n.t('about.missionKicker') }}</span>
          <h1 class="section-head__title">{{ i18n.t('about.missionTitle') }}</h1>
        </div>
      </header>

      <div class="stack stack--lg container--narrow" style="padding-inline: 0">
        <p class="about-lead">{{ mission() }}</p>

        <div class="grid-cards grid-cards--wide">
          <article class="card">
            <div class="card__body">
              <span class="badge badge--gold"
                ><app-icon name="book" /> {{ i18n.t('about.value1Title') }}</span
              >
              <p class="text-muted">{{ i18n.t('about.value1Text') }}</p>
            </div>
          </article>
          <article class="card">
            <div class="card__body">
              <span class="badge"
                ><app-icon name="mosque" /> {{ i18n.t('about.value2Title') }}</span
              >
              <p class="text-muted">{{ i18n.t('about.value2Text') }}</p>
            </div>
          </article>
          <article class="card">
            <div class="card__body">
              <span class="badge badge--info"
                ><app-icon name="globe" /> {{ i18n.t('about.value3Title') }}</span
              >
              <p class="text-muted">{{ i18n.t('about.value3Text') }}</p>
            </div>
          </article>
        </div>

        <div class="alert alert--info">
          <app-icon name="info" />
          <span>{{ i18n.t('about.contentPlaceholder') }}</span>
        </div>

        <div class="card">
          <div class="card__body">
            <h2 style="font-size: var(--fs-lg)">{{ i18n.t('about.contactTitle') }}</h2>
            <p class="text-muted">{{ i18n.t('about.contactPlaceholder') }}</p>
            @if (contactEmail) {
              <a [href]="'mailto:' + contactEmail">{{ contactEmail }}</a>
            }
          </div>
        </div>
      </div>
    </section>
  `,
  styles: [
    `
      .about-lead {
        font-size: var(--fs-lg);
        line-height: var(--lh-relaxed);
        color: var(--c-ink-700);
      }
      .badge {
        align-self: flex-start;
      }
      .badge .icon,
      .badge app-icon {
        inline-size: 0.95rem;
        block-size: 0.95rem;
        width: 0.95rem;
        height: 0.95rem;
      }
    `,
  ],
})
export class AboutPage {
  readonly i18n = inject(I18nService);
  readonly mission = computed(() => this.i18n.localized(siteConfig.mission));
  readonly contactEmail = siteConfig.contactEmail;
}
