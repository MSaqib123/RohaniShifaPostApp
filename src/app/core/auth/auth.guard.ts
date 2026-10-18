import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/**
 * Route guards are **UX navigation only** (§9, §27).
 * The real security boundary lives in `firestore.rules` — a user who forges
 * a client-side flag still cannot read or write protected documents.
 */

/** Extract a safe same-site redirect target from the current URL. */
export function safeRedirect(url: string | undefined): string | null {
  if (!url) return null;
  const queryString = url.split('?')[1];
  if (!queryString) return null;
  const value = new URLSearchParams(queryString).get('redirect');
  // Only allow same-origin application paths (no open redirects).
  if (value && value.startsWith('/') && !value.startsWith('//')) return value;
  return null;
}

function whenReady<T>(auth: AuthService, fn: () => T): T | Promise<T> {
  if (!auth.ready || auth.ready()) {
    return fn();
  }
  return new Promise<T>((resolve) => {
    const timer = setInterval(() => {
      if (auth.ready()) {
        clearInterval(timer);
        resolve(fn());
      }
    }, 20);
  });
}

/** Requires any signed-in user (profile, engagement, …). */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return whenReady(auth, () => {
    if (auth.isLoggedIn()) return true;
    return router.createUrlTree(['/login'], {
      queryParams: { redirect: state.url },
    });
  });
};

/** Requires the `admin` custom claim (or mirrored profile role) — §8. */
export const adminGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return whenReady(auth, () => {
    if (!auth.isLoggedIn()) {
      return router.createUrlTree(['/login'], {
        queryParams: { redirect: state.url },
      });
    }
    if (auth.isAdmin()) return true;
    return router.createUrlTree(['/403']);
  });
};

/** Keeps signed-in users away from login/signup/forgot-password pages. */
export const guestGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return whenReady(auth, () => {
    if (!auth.isLoggedIn()) return true;
    return router.parseUrl(safeRedirect(state.url) ?? '/');
  });
};
