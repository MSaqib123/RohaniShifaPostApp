import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { I18nService } from '../../i18n/i18n.service';
import { IconComponent } from '../../shared/components/icon/icon';

/**
 * Privacy policy placeholder (§59): states plainly which data the platform
 * stores; the full policy text is supplied before public launch.
 */
@Component({
  selector: 'app-privacy-page',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="section container container--narrow">
      <header class="section-head">
        <div class="section-head__titles">
          <span class="section-head__kicker">{{ i18n.t('common.moreInfo') }}</span>
          <h1 class="section-head__title">{{ i18n.t('privacy.title') }}</h1>
          <p class="section-head__sub">{{ i18n.t('privacy.updated') }}</p>
        </div>
      </header>

      <div class="alert alert--info">
        <app-icon name="info" />
        <span>{{ i18n.t('privacy.placeholder') }}</span>
      </div>
    </section>
  `,
})
export class PrivacyPage {
  readonly i18n = inject(I18nService);
}
