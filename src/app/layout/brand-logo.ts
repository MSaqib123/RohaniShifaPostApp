import { ChangeDetectionStrategy, Component } from '@angular/core';
import { siteConfig, SiteConfig } from '../config/site.config';
import { SupportedLanguage } from '../i18n/language.types';

/**
 * Brand mark (§3, §70): renders `siteConfig.logo` when the official logo is
 * supplied, otherwise a generated monogram so the app never shows a broken
 * image placeholder. One file to update when final branding arrives.
 */
@Component({
  selector: 'app-brand-logo',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (config.logo) {
      <img class="logo-img" [src]="config.logo" [alt]="config.logoAlt" width="40" height="40" />
    } @else {
      <svg
        class="logo-mark"
        viewBox="0 0 48 48"
        role="img"
        [attr.aria-label]="config.logoAlt"
        focusable="false"
      >
        <rect x="2" y="2" width="44" height="44" rx="12" fill="url(#rs-brand)" />
        <path
          d="M24 9c-5.5 4.7-8.5 9.5-8.5 14.7 0 5.7 3.8 9.7 8.5 13.3 4.7-3.6 8.5-7.6 8.5-13.3C32.5 18.5 29.5 13.7 24 9Z"
          fill="none"
          stroke="#e6c66a"
          stroke-width="2.2"
        />
        <path
          d="m24 17.4 1.7 4.6 4.6 1.7-4.6 1.7-1.7 4.6-1.7-4.6-4.6-1.7 4.6-1.7Z"
          fill="#e6c66a"
        />
      </svg>
    }
  `,
})
export class BrandLogo {
  readonly config = siteConfig;
}

/** Localized product name for the current language (used by header/footer). */
export function localizedSiteName(
  lang: SupportedLanguage,
  config: SiteConfig = siteConfig,
): string {
  if (lang === 'ar' && config.nameArabic) return config.nameArabic;
  if (lang === 'ur' && config.nameUrdu) return config.nameUrdu;
  return config.name;
}
