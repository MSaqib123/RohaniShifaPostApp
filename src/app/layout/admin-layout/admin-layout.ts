import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { SessionService } from '../../core/auth/session.service';
import { I18nService, TranslationKey } from '../../i18n/i18n.service';
import { LanguageSwitcher } from '../../i18n/language-switcher';
import { IconComponent } from '../../shared/components/icon/icon';
import { ThemeSwitcherComponent } from '../../shared/components/theme-switcher/theme-switcher';
import { BrandLogo, localizedSiteName } from '../brand-logo';

interface AdminLink {
  route: string;
  key: TranslationKey;
  icon: string;
  exact?: boolean;
}

/**
 * Admin application shell (§22): collapsible sidebar navigation, top bar and
 * routed admin workspace. Route-level access is enforced by `adminGuard`
 * (UX) and `firestore.rules` (security).
 */
@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    IconComponent,
    BrandLogo,
    LanguageSwitcher,
    ThemeSwitcherComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-layout.html',
  styleUrl: './admin-layout.scss',
})
export class AdminLayout {
  readonly i18n = inject(I18nService);
  readonly auth = inject(AuthService);
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);

  readonly siteName = computed(() => localizedSiteName(this.i18n.language()));
  readonly sidebarOpen = signal(false);
  readonly currentYear = new Date().getFullYear();

  readonly links: AdminLink[] = [
    { route: '/admin', key: 'admin.dashboard', icon: 'dashboard', exact: true },
    { route: '/admin/posts', key: 'admin.posts', icon: 'post' },
    { route: '/admin/videos', key: 'admin.videos', icon: 'video' },
    { route: '/admin/categories', key: 'admin.categories', icon: 'grid' },
    { route: '/admin/events', key: 'admin.events', icon: 'calendar' },
    { route: '/admin/users', key: 'admin.users', icon: 'user' },
    { route: '/admin/comments', key: 'admin.comments', icon: 'comment' },
    { route: '/admin/reports', key: 'admin.reports', icon: 'flag' },
    { route: '/admin/settings', key: 'admin.settings', icon: 'settings' },
  ];

  constructor() {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.sidebarOpen.set(false));
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.sidebarOpen.set(false);
  }

  closeSidebar(): void {
    this.sidebarOpen.set(false);
  }

  logout(): void {
    void this.session.logout();
  }
}
