import { Routes } from '@angular/router';
import { ProfilePage } from './profile.page';

/**
 * Profile child routes (§28). The parent `/profile` route already carries
 * `authGuard`; children only declare their own titles.
 */
export const PROFILE_ROUTES: Routes = [
  {
    path: '',
    component: ProfilePage,
    data: { titleKey: 'nav.profile' },
  },
];
