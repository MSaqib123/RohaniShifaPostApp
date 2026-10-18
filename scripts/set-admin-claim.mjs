#!/usr/bin/env node
/**
 * Grant or revoke the Rohani Shifa admin **custom claim**.
 *
 * The admin role cannot be granted from the app itself: `firestore.rules`
 * reads `request.auth.token.admin`, and only trusted code may mint that claim.
 * Run this script from your machine with service-account credentials — see
 * FIREBASE_SETUP.md §5.
 *
 * Usage:
 *   node scripts/set-admin-claim.mjs <uid-or-email>           # grant admin
 *   node scripts/set-admin-claim.mjs <uid-or-email> --revoke  # remove admin
 *
 * Credentials (first match wins):
 *   1. GOOGLE_APPLICATION_CREDENTIALS pointing at a service-account JSON
 *   2. `gcloud auth application-default login` (ADC)
 *
 * Requires `firebase-admin`, which is deliberately NOT a project dependency —
 * install it only when you need this:
 *   npm.cmd i -D firebase-admin
 */

const [, , target, flag] = process.argv;

if (!target || (flag && flag !== '--revoke')) {
  console.error('Usage: node scripts/set-admin-claim.mjs <uid-or-email> [--revoke]');
  process.exit(1);
}

const grant = flag !== '--revoke';

let admin;
try {
  // Lazy import so `npm run <anything>` never depends on this optional package.
  admin = await import('firebase-admin');
} catch {
  console.error('firebase-admin is not installed. Run:  npm.cmd i -D firebase-admin');
  process.exit(1);
}

admin.initializeApp({ credential: admin.credential.applicationDefault() });
const auth = admin.auth();

// Accept either a uid or an email address — the email is what a human has handy.
const user = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target)
  ? await auth.getUserByEmail(target).catch(() => null)
  : await auth.getUser(target).catch(() => null);

if (!user) {
  console.error(`No Firebase Auth user matches "${target}".`);
  process.exit(1);
}

await auth.setCustomUserClaims(user.uid, { ...(grant ? { admin: true } : {}) });

console.log(`${grant ? 'Granted' : 'Revoked'} admin claim for ${user.email} (${user.uid}).`);
console.log('The user must sign out and sign in again (or reload) for the new claim to apply.');
