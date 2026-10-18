import { Routes } from '@angular/router';
import { adminGuard, authGuard, guestGuard } from './core/auth/auth.guard';
import { AdminLayout } from './layout/admin-layout/admin-layout';
import { PublicLayout } from './layout/public-layout';

/**
 * Application route map (§28).
 *
 * • Public routes render inside `PublicLayout`, admin routes inside `AdminLayout`.
 * • Everything is lazy-loaded (`loadComponent`) for route-level code splitting.
 * • Guards are navigation UX only — `firestore.rules` is the security boundary.
 * • `data.titleKey` / `data.descKey` feed the i18n-aware title strategy (SEO).
 */
export const routes: Routes = [
  // ── Admin (declared first so /admin never falls through to the SPA 404) ──
  {
    path: 'admin',
    component: AdminLayout,
    canActivate: [authGuard, adminGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./admin/dashboard/dashboard.page').then((m) => m.DashboardPage),
        data: { titleKey: 'admin.dashboard', descKey: 'admin.dashboardSub' },
      },
      {
        path: 'posts',
        loadComponent: () => import('./admin/posts/admin-posts.page').then((m) => m.AdminPostsPage),
        data: { titleKey: 'admin.posts' },
      },
      {
        path: 'posts/new',
        loadComponent: () => import('./admin/posts/post-form.page').then((m) => m.PostFormPage),
        data: { titleKey: 'admin.postForm.new' },
      },
      {
        path: 'posts/:id/edit',
        loadComponent: () => import('./admin/posts/post-form.page').then((m) => m.PostFormPage),
        data: { titleKey: 'admin.postForm.edit' },
      },
      {
        path: 'videos',
        loadComponent: () =>
          import('./admin/videos/admin-videos.page').then((m) => m.AdminVideosPage),
        data: { titleKey: 'admin.videos' },
      },
      {
        path: 'videos/new',
        loadComponent: () => import('./admin/videos/video-form.page').then((m) => m.VideoFormPage),
        data: { titleKey: 'admin.videoForm.new' },
      },
      {
        path: 'videos/:id/edit',
        loadComponent: () => import('./admin/videos/video-form.page').then((m) => m.VideoFormPage),
        data: { titleKey: 'admin.videoForm.edit' },
      },
      {
        path: 'categories',
        loadComponent: () =>
          import('./admin/categories/admin-categories.page').then((m) => m.AdminCategoriesPage),
        data: { titleKey: 'admin.categories' },
      },
      {
        path: 'events',
        loadComponent: () =>
          import('./admin/events/admin-events.page').then((m) => m.AdminEventsPage),
        data: { titleKey: 'admin.events' },
      },
      {
        path: 'users',
        loadComponent: () => import('./admin/users/admin-users.page').then((m) => m.AdminUsersPage),
        data: { titleKey: 'admin.users' },
      },
      {
        path: 'comments',
        loadComponent: () =>
          import('./admin/comments/admin-comments.page').then((m) => m.AdminCommentsPage),
        data: { titleKey: 'admin.comments' },
      },
      {
        path: 'reports',
        loadComponent: () =>
          import('./admin/reports/admin-reports.page').then((m) => m.AdminReportsPage),
        data: { titleKey: 'admin.reports' },
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./admin/settings/admin-settings.page').then((m) => m.AdminSettingsPage),
        data: { titleKey: 'admin.settings' },
      },
      { path: '**', redirectTo: '' },
    ],
  },

  // ── Public application ───────────────────────────────────────────────────
  {
    path: '',
    component: PublicLayout,
    children: [
      {
        path: '',
        loadComponent: () => import('./features/home/home.page').then((m) => m.HomePage),
        data: { titleKey: 'nav.home', descKey: 'home.heroSubtitle' },
      },
      {
        path: 'posts',
        loadComponent: () => import('./features/posts/post-list.page').then((m) => m.PostListPage),
        data: { titleKey: 'nav.posts', descKey: 'posts.subtitle' },
      },
      {
        path: 'posts/:id',
        loadComponent: () =>
          import('./features/posts/post-detail.page').then((m) => m.PostDetailPage),
        data: { titleKey: 'nav.posts', descKey: 'posts.subtitle' },
      },
      {
        path: 'videos',
        loadComponent: () =>
          import('./features/videos/video-list.page').then((m) => m.VideoListPage),
        data: { titleKey: 'nav.videos', descKey: 'videos.subtitle' },
      },
      {
        path: 'videos/:id',
        loadComponent: () =>
          import('./features/videos/video-detail.page').then((m) => m.VideoDetailPage),
        data: { titleKey: 'nav.videos', descKey: 'videos.subtitle' },
      },
      {
        path: 'events',
        loadComponent: () =>
          import('./features/events/event-list.page').then((m) => m.EventListPage),
        data: { titleKey: 'nav.events', descKey: 'events.subtitle' },
      },
      {
        path: 'events/:id',
        loadComponent: () =>
          import('./features/events/event-detail.page').then((m) => m.EventDetailPage),
        data: { titleKey: 'nav.events', descKey: 'events.subtitle' },
      },
      {
        path: 'categories',
        loadComponent: () =>
          import('./features/categories/category-list.page').then((m) => m.CategoryListPage),
        data: { titleKey: 'nav.categories', descKey: 'categories.subtitle' },
      },
      {
        path: 'categories/:slug',
        loadComponent: () =>
          import('./features/categories/category-detail.page').then((m) => m.CategoryDetailPage),
        data: { titleKey: 'nav.categories', descKey: 'categories.subtitle' },
      },
      {
        path: 'search',
        loadComponent: () => import('./features/search/search.page').then((m) => m.SearchPage),
        data: { titleKey: 'nav.search', descKey: 'search.note' },
      },
      {
        path: 'about',
        loadComponent: () => import('./features/about/about.page').then((m) => m.AboutPage),
        data: { titleKey: 'about.title', descKey: 'about.missionKicker' },
      },
      {
        path: 'privacy',
        loadComponent: () => import('./features/privacy/privacy.page').then((m) => m.PrivacyPage),
        data: { titleKey: 'privacy.title', descKey: 'privacy.placeholder' },
      },

      // ── Guests only ──────────────────────────────────────────────────────
      {
        path: 'login',
        canActivate: [guestGuard],
        loadComponent: () => import('./features/auth/login.page').then((m) => m.LoginPage),
        data: { titleKey: 'nav.login', descKey: 'auth.loginSubtitle' },
      },
      {
        path: 'signup',
        canActivate: [guestGuard],
        loadComponent: () => import('./features/auth/signup.page').then((m) => m.SignupPage),
        data: { titleKey: 'nav.signup', descKey: 'auth.signupSubtitle' },
      },
      {
        path: 'forgot-password',
        canActivate: [guestGuard],
        loadComponent: () =>
          import('./features/auth/forgot-password.page').then((m) => m.ForgotPasswordPage),
        data: { titleKey: 'auth.forgotTitle', descKey: 'auth.forgotSubtitle' },
      },

      // ── Signed-in users ──────────────────────────────────────────────────
      {
        path: 'profile',
        canActivate: [authGuard],
        loadChildren: () =>
          import('./features/profile/profile.routes').then((m) => m.PROFILE_ROUTES),
        data: { titleKey: 'nav.profile' },
      },

      // ── Error pages ──────────────────────────────────────────────────────
      {
        path: '403',
        loadComponent: () =>
          import('./features/errors/forbidden.page').then((m) => m.ForbiddenPage),
        data: { titleKey: 'error.forbiddenTitle', descKey: 'error.forbiddenMessage' },
      },
      {
        path: '**',
        loadComponent: () => import('./features/errors/not-found.page').then((m) => m.NotFoundPage),
        data: { titleKey: 'error.notFoundTitle', descKey: 'error.notFoundMessage' },
      },
    ],
  },
];
