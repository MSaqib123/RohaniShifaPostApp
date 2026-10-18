import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { I18nService } from '../i18n/i18n.service';
import { Footer } from './footer/footer';
import { Header } from './header/header';

/**
 * Public application shell: skip link → sticky header → routed content →
 * footer. Every guest-facing route renders inside this layout (§28).
 */
@Component({
  selector: 'app-public-layout',
  standalone: true,
  imports: [RouterOutlet, Header, Footer],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a class="skip-link" href="#main-content">{{ i18n.t('nav.skipToContent') }}</a>
    <app-header />
    <main id="main-content" class="site-main" tabindex="-1">
      <router-outlet />
    </main>
    <app-footer />
  `,
})
export class PublicLayout {
  readonly i18n = inject(I18nService);
}
