import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { siteConfig, SiteSocialLinks } from '../../config/site.config';
import { I18nService, TranslationKey } from '../../i18n/i18n.service';
import { IconComponent } from '../../shared/components/icon/icon';
import { BrandLogo, localizedSiteName } from '../brand-logo';

interface FooterLink {
  route: string;
  key: TranslationKey;
}

interface SocialLink {
  label: string;
  href: string;
  icon?: string;
}

/**
 * Site footer (§52/§53): mission line, navigation columns, official social
 * channels ”” all driven by `siteConfig` so rebranding touches one file.
 */
@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink, IconComponent, BrandLogo],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './footer.html',
  styleUrl: './footer.scss',
})
export class Footer {
  readonly i18n = inject(I18nService);
  readonly config = siteConfig;

  readonly siteName = computed(() => localizedSiteName(this.i18n.language()));
  readonly mission = computed(() => this.i18n.localized(this.config.mission));
  readonly year = new Date().getFullYear();

  readonly exploreLinks: FooterLink[] = [
    { route: '/posts', key: 'nav.posts' },
    { route: '/videos', key: 'nav.videos' },
    { route: '/events', key: 'nav.events' },
    { route: '/categories', key: 'nav.categories' },
    { route: '/search', key: 'nav.search' },
  ];

  readonly infoLinks: FooterLink[] = [
    { route: '/about', key: 'nav.about' },
    { route: '/privacy', key: 'privacy.title' },
  ];

  readonly accountLinks: FooterLink[] = [
    { route: '/login', key: 'nav.login' },
    { route: '/signup', key: 'nav.signup' },
  ];

  /** Official social channels — only those configured in siteConfig. */
  readonly socialLinks = computed<SocialLink[]>(() => {
    const social: SiteSocialLinks = this.config.social;
    const entries: Array<[keyof SiteSocialLinks, string, string | undefined]> = [
      ['youtube', 'YouTube', 'youtube'],
      ['whatsApp', this.i18n.t('share.whatsapp'), 'whatsapp'],
      ['facebook', this.i18n.t('share.facebook'), 'facebook'],
      ['x', this.i18n.t('share.x'), undefined],
      ['instagram', 'Instagram', undefined],
      ['telegram', 'Telegram', undefined],
    ];
    return entries
      .filter(([key]) => !!social[key])
      .map(([key, label, icon]) => ({ label, href: social[key]!, icon }));
  });
}
