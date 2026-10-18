import type { TranslationKey } from '../../i18n/i18n.service';

/**
 * Translate Firebase Authentication error codes into user-facing messages (§33).
 * Raw SDK errors never reach the UI, and no sensitive detail is exposed.
 *
 * Kept as a pure function so it is trivially unit-testable (§51).
 */
export function mapAuthError(error: unknown): TranslationKey {
  const code = (error as { code?: string })?.code ?? '';
  const key = AUTH_ERROR_KEYS[code as keyof typeof AUTH_ERROR_KEYS];
  return key ?? 'auth.genericError';
}

const AUTH_ERROR_KEYS = {
  'auth/invalid-email': 'auth.invalidEmail',
  'auth/missing-email': 'auth.required',
  'auth/missing-password': 'auth.required',
  'auth/invalid-credential': 'auth.invalidCredentials',
  'auth/invalid-login-credentials': 'auth.invalidCredentials',
  'auth/wrong-password': 'auth.invalidCredentials',
  'auth/user-mismatch': 'auth.invalidCredentials',
  'auth/user-not-found': 'auth.userNotFound',
  'auth/email-already-in-use': 'auth.emailInUse',
  'auth/weak-password': 'auth.weakPassword',
  'auth/too-many-requests': 'auth.tooManyRequests',
  'auth/network-request-failed': 'auth.networkError',
  'auth/operation-not-allowed': 'auth.notConfigured',
  'auth/configuration-not-found': 'auth.notConfigured',
  'app/not-configured': 'auth.notConfigured',
} as const satisfies Record<string, TranslationKey>;
