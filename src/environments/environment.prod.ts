/**
 * Production environment configuration.
 *
 * Replace the Firebase values with the production web app config from
 * Firebase console → Project settings → Your apps → SDK setup and configuration.
 * `baseHref` must match the GitHub Pages path, e.g. '/My-Repo/' for
 * https://<user>.github.io/My-Repo/  ('/' for a custom domain / user site).
 *
 * See DEPLOYMENT.md.
 */
export const environment = {
  production: true,

  /**
   * Must equal the `baseHref` of the deploy target in angular.json (the
   * sub-path GitHub Pages serves this project from). Used only for
   * canonical/OG URLs — see DEPLOYMENT.md.
   */
  baseHref: '/RohaniShifaPostApp/',

  /**
   * `firebase.authDomain` below is the domain Firebase Auth uses for
   * redirects. It must also appear in the console allow-list:
   * Authentication → Settings → Authorized domains ('<user>.github.io').
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

  /**
   * Reserved. No analytics code is bundled today — this flag exists so the
   * intent (analytics stays off, §59) is visible next to the config. Enabling
   * it means importing and initializing the Firebase Analytics SDK.
   */
  analyticsEnabled: false,
};
