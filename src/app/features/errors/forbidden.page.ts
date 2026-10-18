import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService } from '../../i18n/i18n.service';
import { IconComponent } from '../../shared/components/icon/icon';

/** 403 page — shown when a signed-in non-admin enters /admin (§8). */
@Component({
  selector: 'app-forbidden-page',
  standalone: true,
  imports: [RouterLink, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="section container">
      <div class="state state--error">
        <app-icon name="shield" />
        <h1>{{ i18n.t('error.forbiddenTitle') }}</h1>
        <p>{{ i18n.t('error.forbiddenMessage') }}</p>
        <a class="btn" routerLink="/">{{ i18n.t('error.goHome') }}</a>
      </div>
    </section>
  `,
})
export class ForbiddenPage {
  readonly i18n = inject(I18nService);
}
