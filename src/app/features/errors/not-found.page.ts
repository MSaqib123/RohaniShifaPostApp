import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService } from '../../i18n/i18n.service';
import { IconComponent } from '../../shared/components/icon/icon';

/** 404 page inside the public shell (§28). */
@Component({
  selector: 'app-not-found-page',
  standalone: true,
  imports: [RouterLink, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="section container">
      <div class="state">
        <app-icon name="search" />
        <h1>{{ i18n.t('error.notFoundTitle') }}</h1>
        <p>{{ i18n.t('error.notFoundMessage') }}</p>
        <a class="btn" routerLink="/">{{ i18n.t('error.goHome') }}</a>
      </div>
    </section>
  `,
})
export class NotFoundPage {
  readonly i18n = inject(I18nService);
}
