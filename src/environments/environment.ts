/**
 * Development environment configuration.
 *
 * FIREBASE WEB CONFIGURATION
 * ---------------------------
 * The Firebase web config below is safe to expose in the browser (it identifies
 * your project, it is NOT a secret). Authorization is enforced exclusively by
 * Firestore Security Rules — see firestore.rules and SECURITY.md.
 *
 * Until real values are provided, `firebaseConfigured` stays false and the app
 * runs in "offline demo mode": public pages render empty states and auth actions
 * show a friendly configuration notice instead of crashing.
 *
 * See FIREBASE_SETUP.md for step-by-step instructions.
 */
export const environment = {
  production: false,

  /** GitHub Pages sub-path (e.g. '/RohaniShifaPostApp/'). '' when served from root. */
  baseHref: '/',

  /**
   * `firebase.authDomain` below is the domain Firebase Auth uses for
   * redirects. It must also appear in the console allow-list:
   * Authentication → Settings → Authorized domains ('localhost' here).
   */
  firebase: {
    apiKey: 'AIzaSyAEZMxrgm5rWaQ_zhNK2v3t6LqhXcwRNxQ',
    authDomain: 'rohani-shifa-app.firebaseapp.com',
    projectId: 'rohani-shifa-app',
    storageBucket: 'rohani-shifa-app.firebasestorage.app',
    messagingSenderId: '185414636663',
    appId: '1:185414636663:web:c15bf7e032e0830ffd6272',
    measurementId: 'G-12XV9GCZ9C',
  },

  /** Google Analytics — off by default (privacy-conscious choice, §59). */
  analyticsEnabled: false,
};
