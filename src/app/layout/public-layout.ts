import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth/auth.service';
import { I18nService } from '../i18n/i18n.service';
import { IconComponent } from '../shared/components/icon/icon';
import { Footer } from './footer/footer';
import { Header } from './header/header';

/**
 * Public application shell: skip link → sticky header → routed content →
 * footer. Every guest-facing route renders inside this layout (§28).
 */
@Component({
  selector: 'app-public-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, Header, Footer, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a class="skip-link" href="#main-content">{{ i18n.t('nav.skipToContent') }}</a>
    <app-header />
    <main id="main-content" class="site-main" tabindex="-1">
      <router-outlet />
    </main>

    @if (auth.isLoggedIn()) {
      <aside aria-label="Islamic AI Assistant">
        <a
          class="floating-ai-agent-btn"
          [routerLink]="['/search']"
          [queryParams]="{ q: 'who are you' }"
          title="Rohani Shifa Islamic AI Agent - Ask Anything"
          aria-label="Ask Islamic AI Agent"
        >
          <span class="floating-ai-agent-btn__pulse" aria-hidden="true"></span>
          <span class="floating-ai-agent-btn__icon">
            <app-icon name="sparkle" />
          </span>
          <span class="floating-ai-agent-btn__text">
            <span class="title">Islamic AI</span>
            <span class="sub">Ask Agent</span>
          </span>
        </a>
      </aside>
    }

    <app-footer />
  `,
})
export class PublicLayout {
  readonly i18n = inject(I18nService);
  readonly auth = inject(AuthService);
}
