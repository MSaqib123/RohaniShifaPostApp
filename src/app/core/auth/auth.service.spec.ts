import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { FirebaseNotConfiguredError, FirebaseService } from '../firebase/firebase.service';
import { AuthService } from './auth.service';

/**
 * These tests run in the repository's demo state: `firebase.configured === false` (demo mode).
 * What they pin down is the honest-degradation contract — the service must neither
 * pretend a user is signed in nor crash (§61).
 *
 * The configured paths (real sign-in, profile listener, claims) need a
 * Firebase project or the emulator and are documented in FIREBASE_SETUP.md.
 */
describe('AuthService in demo mode', () => {
  let auth: AuthService;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: FirebaseService,
          useValue: {
            configured: false,
            requireAuth: () => {
              throw new FirebaseNotConfiguredError();
            },
            requireDb: () => {
              throw new FirebaseNotConfiguredError();
            },
          },
        },
      ],
    });
    auth = TestBed.inject(AuthService);
  });

  it('is ready immediately and reports a guest session', () => {
    expect(auth.ready()).toBe(true);
    expect(auth.user()).toBeNull();
    expect(auth.profile()).toBeNull();
    expect(auth.isLoggedIn()).toBe(false);
    expect(auth.emailVerified()).toBe(false);
  });

  it('never grants admin without a claim', () => {
    expect(auth.isAdmin()).toBe(false);
  });

  it('exposes an empty display name and a placeholder initial', () => {
    expect(auth.displayName()).toBe('');
    expect(auth.initials()).toBe('?');
  });

  it('rejects sign-in, sign-up and password reset with a configuration error', async () => {
    await expect(auth.signIn('reader@example.com', 'secret')).rejects.toBeInstanceOf(
      FirebaseNotConfiguredError,
    );
    await expect(
      auth.signUp({ email: 'reader@example.com', password: 'secret', displayName: 'Reader' }),
    ).rejects.toBeInstanceOf(FirebaseNotConfiguredError);
    await expect(auth.sendPasswordReset('reader@example.com')).rejects.toBeInstanceOf(
      FirebaseNotConfiguredError,
    );
    await expect(auth.resendVerificationEmail()).rejects.toBeInstanceOf(FirebaseNotConfiguredError);
  });

  it('refuses profile edits while signed out instead of writing anything', async () => {
    // Demo mode has no Firestore handle to write through; with a real project
    // the same call rejects with `auth.unauthorizedAction` because no user is
    // signed in. Either way: nothing is written.
    await expect(auth.updateOwnProfile({ displayName: 'Hacked' })).rejects.toThrow();
    expect(auth.profile()).toBeNull();
  });

  it('signs out and refreshes claims as no-ops', async () => {
    await expect(auth.signOut()).resolves.toBeUndefined();
    await expect(auth.refreshClaims()).resolves.toBeUndefined();
    expect(auth.isLoggedIn()).toBe(false);
  });
});
