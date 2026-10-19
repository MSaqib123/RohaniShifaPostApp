import { CdkTrapFocus } from '@angular/cdk/a11y';
import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  HostListener,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs';
import { SessionService } from '../../core/auth/session.service';
import { AuthService } from '../../core/auth/auth.service';
import { I18nService, TranslationKey } from '../../i18n/i18n.service';
import { LanguageSwitcher } from '../../i18n/language-switcher';
import { IconComponent } from '../../shared/components/icon/icon';
import { BrandLogo, localizedSiteName } from '../brand-logo';

interface NavLink {
  route: string;
  key: TranslationKey;
  icon: string;
  exact?: boolean;
}

/**
 * Public site header (§29): sticky bar with brand, primary navigation,
 * search, language switcher, authentication controls and a focus-trapped
 * mobile drawer.
 */
@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, IconComponent, BrandLogo, LanguageSwitcher, CdkTrapFocus],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  readonly i18n = inject(I18nService);
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly session = inject(SessionService);
  private readonly document = inject(DOCUMENT);

  readonly siteName = computed(() => localizedSiteName(this.i18n.language()));

  readonly navLinks: NavLink[] = [
    { route: '/', key: 'nav.home', icon: 'home', exact: true },
    { route: '/posts', key: 'nav.posts', icon: 'post' },
    { route: '/videos', key: 'nav.videos', icon: 'video' },
    { route: '/events', key: 'nav.events', icon: 'calendar' },
    { route: '/categories', key: 'nav.categories', icon: 'grid' },
    { route: '/about', key: 'nav.about', icon: 'mosque' },
  ];

  readonly scrolled = signal(false);
  readonly drawerOpen = signal(false);
  readonly userMenuOpen = signal(false);

  constructor() {
    // Lock background scroll while the mobile drawer is open.
    effect((cleanup) => {
      const open = this.drawerOpen();
      const body = this.document.body;
      if (open) body.style.overflow = 'hidden';
      cleanup(() => {
        body.style.overflow = '';
      });
    });

    // Any navigation closes transient UI (drawer / dropdowns).
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        this.drawerOpen.set(false);
        this.userMenuOpen.set(false);
      });
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    this.scrolled.set((this.document.defaultView?.scrollY ?? 0) > 8);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.drawerOpen.set(false);
    this.userMenuOpen.set(false);
  }

  /** Close the user dropdown when clicking outside its anchor. */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    if (target?.closest('.user-menu-anchor') === null) {
      this.userMenuOpen.set(false);
    }
  }

  toggleDrawer(event?: Event): void {
    event?.stopPropagation();
    this.drawerOpen.update((open) => !open);
  }

  closeDrawer(): void {
    this.drawerOpen.set(false);
  }

  closeMenus(): void {
    this.userMenuOpen.set(false);
  }

  /** Confirmed sign-out with pending-action cleanup (§19, §61). */
  async logout(): Promise<void> {
    this.closeMenus();
    this.closeDrawer();
    await this.session.logout();
  }
}
