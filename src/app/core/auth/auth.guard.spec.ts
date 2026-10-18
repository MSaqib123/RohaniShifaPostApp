import { EnvironmentInjector, runInInjectionContext } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { ActivatedRouteSnapshot, CanActivateFn, RouterStateSnapshot } from '@angular/router';
import { provideRouter, Router, UrlTree } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { AuthService } from './auth.service';
import { adminGuard, authGuard, guestGuard, safeRedirect } from './auth.guard';

/**
 * Guards are plain functions that call `inject()` — Angular's router runs them
 * inside an injection context, so the test harness must do the same.
 */
function harness(state: { loggedIn: boolean; admin: boolean }) {
  const stub = {
    isLoggedIn: () => state.loggedIn,
    isAdmin: () => state.admin,
  } as unknown as AuthService;

  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [provideRouter([]), { provide: AuthService, useValue: stub }],
  });

  const injector = TestBed.inject(EnvironmentInjector);
  const router = TestBed.inject(Router);

  return {
    router,
    run(guard: CanActivateFn, url = '/profile') {
      return runInInjectionContext(injector, () =>
        guard({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot),
      );
    },
  };
}

describe('safeRedirect', () => {
  it('returns null when there is no url or no query string', () => {
    expect(safeRedirect(undefined)).toBeNull();
    expect(safeRedirect('')).toBeNull();
    expect(safeRedirect('/login')).toBeNull();
  });

  it('extracts a same-origin application path', () => {
    expect(safeRedirect('/login?redirect=/profile')).toBe('/profile');
    expect(safeRedirect('/login?redirect=/posts/abc?tab=2&x=1')).toBe('/posts/abc');
  });

  it('rejects absolute and protocol-relative targets (open redirect)', () => {
    expect(safeRedirect('/login?redirect=https://evil.example')).toBeNull();
    expect(safeRedirect('/login?redirect=//evil.example')).toBeNull();
    expect(safeRedirect('/login?redirect=javascript:alert(1)')).toBeNull();
  });

  it('ignores unrelated query parameters', () => {
    expect(safeRedirect('/login?foo=bar')).toBeNull();
  });
});

describe('authGuard', () => {
  it('lets a signed-in user through', () => {
    const h = harness({ loggedIn: true, admin: false });
    expect(h.run(authGuard)).toBe(true);
  });

  it('sends a guest to /login carrying the original url', () => {
    const h = harness({ loggedIn: false, admin: false });
    const result = h.run(authGuard, '/profile');

    expect(result).toBeInstanceOf(UrlTree);
    const tree = result as UrlTree;
    expect(tree.root.children['primary'].segments.map((s) => s.path).join('/')).toBe('login');
    expect(tree.queryParams['redirect']).toBe('/profile');
  });
});

describe('adminGuard', () => {
  it('sends a guest to /login', () => {
    const h = harness({ loggedIn: false, admin: false });
    expect(h.router.serializeUrl(h.run(adminGuard) as UrlTree)).toContain('/login');
  });

  it('sends a signed-in non-admin to /403', () => {
    const h = harness({ loggedIn: true, admin: false });
    expect(h.router.serializeUrl(h.run(adminGuard) as UrlTree)).toBe('/403');
  });

  it('admits an admin', () => {
    const h = harness({ loggedIn: true, admin: true });
    expect(h.run(adminGuard)).toBe(true);
  });
});

describe('guestGuard', () => {
  it('lets a guest reach the login page', () => {
    const h = harness({ loggedIn: false, admin: false });
    expect(h.run(guestGuard, '/login')).toBe(true);
  });

  it('bounces a signed-in user back to the app root', () => {
    const h = harness({ loggedIn: true, admin: false });
    expect(h.router.serializeUrl(h.run(guestGuard, '/login') as UrlTree)).toBe('/');
  });

  it('honours a safe redirect target for a signed-in user', () => {
    const h = harness({ loggedIn: true, admin: false });
    expect(h.router.serializeUrl(h.run(guestGuard, '/login?redirect=/posts') as UrlTree)).toBe(
      '/posts',
    );
  });
});
