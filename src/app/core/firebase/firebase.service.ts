import { Injectable } from '@angular/core';
import { FirebaseApp, getApps, initializeApp } from 'firebase/app';
import { Auth, getAuth } from 'firebase/auth';
import { Firestore, getFirestore, initializeFirestore } from 'firebase/firestore';
import { environment } from '../../../environments/environment';

/** Thrown (conceptually) when an operation requires Firebase configuration. */
export class FirebaseNotConfiguredError extends Error {
  readonly code = 'app/not-configured';
  constructor() {
    super('Firebase is not configured. See FIREBASE_SETUP.md.');
  }
}

function looksPlaceholder(value: string | undefined): boolean {
  return !value || value.startsWith('REPLACE_WITH');
}

/**
 * True once real Firebase web-config values replace the placeholders in
 * `src/environments/environment*.ts`.
 */
export function isFirebaseConfigured(): boolean {
  const cfg = environment.firebase;
  return (
    !!cfg &&
    !looksPlaceholder(cfg.apiKey) &&
    !looksPlaceholder(cfg.projectId) &&
    !looksPlaceholder(cfg.appId)
  );
}

/**
 * Single Firebase entry point for the whole application (§39).
 *
 * Everything lives in one provider so that:
 *  • the SDK is initialized exactly once,
 *  • services can check `configured` and degrade gracefully in demo mode
 *    instead of crashing before the developer has set up Firebase.
 *
 * The web config here is intentionally public — authorization is enforced by
 * `firestore.rules`, never by hiding configuration (§26).
 */
@Injectable({ providedIn: 'root' })
export class FirebaseService {
  /** Whether real configuration values are present. */
  readonly configured = isFirebaseConfigured();

  private app: FirebaseApp | null = null;
  private authInstance: Auth | null = null;
  private dbInstance: Firestore | null = null;

  constructor() {
    if (this.configured) {
      this.app = getApps().length ? getApps()[0] : initializeApp(environment.firebase);
      this.authInstance = getAuth(this.app);
      try {
        this.dbInstance = initializeFirestore(this.app, {
          ignoreUndefinedProperties: true,
        });
      } catch {
        this.dbInstance = getFirestore(this.app);
      }
    }
  }

  get auth(): Auth | null {
    return this.authInstance;
  }

  get db(): Firestore | null {
    return this.dbInstance;
  }

  /** Non-null FirebaseApp handle — call only after checking `configured`. */
  requireApp(): FirebaseApp {
    if (!this.app) throw new FirebaseNotConfiguredError();
    return this.app;
  }

  get appInstance(): FirebaseApp | null {
    return this.app;
  }

  /** Non-null auth handle — call only after checking `configured`. */
  requireAuth(): Auth {
    if (!this.authInstance) throw new FirebaseNotConfiguredError();
    return this.authInstance;
  }

  /** Non-null Firestore handle — call only after checking `configured`. */
  requireDb(): Firestore {
    if (!this.dbInstance) throw new FirebaseNotConfiguredError();
    return this.dbInstance;
  }
}
