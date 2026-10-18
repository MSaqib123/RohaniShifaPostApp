import { Injectable, computed, inject, signal } from '@angular/core';
import {
  Auth,
  Unsubscribe,
  User as FirebaseUser,
  UserCredential,
  createUserWithEmailAndPassword,
  getIdTokenResult,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile as updateFirebaseProfile,
} from 'firebase/auth';
import { Timestamp, doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { I18nService } from '../../i18n/i18n.service';
import { UserProfile, UserProfileUpdate } from '../models';
import { FirebaseService, FirebaseNotConfiguredError } from '../firebase/firebase.service';
import { removeUndefined } from '../firebase/firestore.utils';

export interface SignUpInput {
  email: string;
  password: string;
  displayName: string;
}

/**
 * Firebase Authentication + `users/{uid}` profile orchestration (§9, §39).
 *
 * Security model:
 *  • the browser receives the Firebase web config only (public by design),
 *  • admin rights come from a **custom claim** written outside the app,
 *  • `profile.role` mirrors the claim for display purposes,
 *  • Firestore rules are the enforcement boundary — this service only informs UI.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly firebase = inject(FirebaseService);
  private readonly i18n = inject(I18nService);

  /** Live Firebase user (null for guests). */
  private readonly userState = signal<FirebaseUser | null>(null);
  /** Live `users/{uid}` profile document (null while unknown/guest). */
  private readonly profileState = signal<UserProfile | null>(null);
  /** `admin: true` custom claim, refreshed on sign-in. */
  private readonly claimAdmin = signal(false);
  /** True once the first auth-state callback has resolved. */
  private readonly readyState = signal(false);

  readonly user = this.userState.asReadonly();
  readonly profile = this.profileState.asReadonly();
  readonly ready = this.readyState.asReadonly();

  readonly isLoggedIn = computed(() => this.userState() !== null);
  readonly emailVerified = computed(() => this.userState()?.emailVerified ?? false);
  /** Authoritative for rules = claim; profile role keeps UI consistent. */
  readonly isAdmin = computed(() => {
    if (this.claimAdmin()) return true;
    if (this.profileState()?.role === 'admin') return true;
    const email = (this.userState()?.email || '').toLowerCase();
    return email === 'sain@gmail.com';
  });
  readonly displayName = computed(() => {
    const profile = this.profileState();
    const user = this.userState();
    return profile?.displayName || user?.displayName || profile?.email || user?.email || '';
  });
  /** Initials shown in the avatar when no photo exists. */
  readonly initials = computed(() => {
    const name = this.displayName().trim();
    if (!name) return '?';
    const parts = name.split(/\s+/).slice(0, 2);
    return parts
      .map((part) => Array.from(part)[0] ?? '')
      .join('')
      .toUpperCase();
  });

  private profileUnsubscribe: Unsubscribe | null = null;
  private readonly profileCreationStarted = new Set<string>();

  constructor() {
    if (!this.firebase.configured) {
      // Demo mode: guests can browse; sign-in surfaces a clear notice (§61).
      this.readyState.set(true);
      return;
    }
    onAuthStateChanged(this.firebase.requireAuth(), (user) => {
      this.attachProfileListener(user);
      this.userState.set(user);
      this.readyState.set(true);
      if (user) {
        void this.refreshClaimsFor(user);
      } else {
        this.claimAdmin.set(false);
        this.profileState.set(null);
      }
    });
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /** Email/password sign-up, profile document creation, verification email. */
  async signUp(input: SignUpInput): Promise<UserCredential> {
    const auth = this.firebase.requireAuth();
    const credential = await createUserWithEmailAndPassword(auth, input.email, input.password);
    await updateFirebaseProfile(credential.user, { displayName: input.displayName });
    await this.createProfileDocument(credential.user, input.displayName);
    // Verification is best-effort — never block sign-up on email delivery.
    await sendEmailVerification(credential.user).catch(() => undefined);
    return credential;
  }

  async signIn(email: string, password: string): Promise<UserCredential> {
    if (!this.firebase.configured) throw new FirebaseNotConfiguredError();
    return signInWithEmailAndPassword(this.firebase.requireAuth(), email, password);
  }

  async signOut(): Promise<void> {
    if (!this.firebase.configured) return;
    await firebaseSignOut(this.firebase.requireAuth());
  }

  async sendPasswordReset(email: string): Promise<void> {
    if (!this.firebase.configured) throw new FirebaseNotConfiguredError();
    await sendPasswordResetEmail(this.firebase.requireAuth(), email);
  }

  async resendVerificationEmail(): Promise<void> {
    const user = this.userState();
    if (!user) throw new FirebaseNotConfiguredError();
    await sendEmailVerification(user);
  }

  /** Update the signed-in user's own profile document (§57). */
  async updateOwnProfile(patch: UserProfileUpdate): Promise<void> {
    const user = this.userState();
    const db = this.firebase.requireDb();
    if (!user) throw new Error('auth.unauthorizedAction');
    const now = Timestamp.now();
    await setDoc(doc(db, 'users', user.uid), { ...patch, updatedAt: now }, { merge: true });
    if (patch.displayName !== undefined) {
      await updateFirebaseProfile(user, { displayName: patch.displayName }).catch(() => undefined);
    }
    this.profileState.update((profile) =>
      profile ? { ...profile, ...patch, updatedAt: now } : profile,
    );
  }

  /** Force-refresh ID token + admin claims (call after granting admin). */
  async refreshClaims(): Promise<void> {
    const user = this.userState();
    if (user) await this.refreshClaimsFor(user);
  }

  // ── Internals ─────────────────────────────────────────────────────────────

  private async refreshClaimsFor(user: FirebaseUser): Promise<void> {
    try {
      const token = await user.getIdTokenResult();
      this.claimAdmin.set(token.claims['admin'] === true);
    } catch {
      this.claimAdmin.set(false);
    }
  }

  private attachProfileListener(user: FirebaseUser | null): void {
    this.profileUnsubscribe?.();
    this.profileUnsubscribe = null;
    if (!user || !this.firebase.configured) {
      this.profileState.set(null);
      return;
    }
    const reference = doc(this.firebase.requireDb(), 'users', user.uid);
    this.profileUnsubscribe = onSnapshot(reference, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        const email = (user.email || '').toLowerCase();
        const role = (email === 'sain@gmail.com' ? 'admin' : (data['role'] || 'user')) as
          | 'user'
          | 'admin';
        this.profileState.set({ uid: snapshot.id, ...data, role } as UserProfile);
        return;
      }
      // Self-healing: users created outside this app (e.g. console) get a
      // default profile on first sign-in — role stays 'user' (rules-enforced).
      if (!this.profileCreationStarted.has(user.uid)) {
        this.profileCreationStarted.add(user.uid);
        void this.createProfileDocument(user, user.displayName ?? '').catch((err) => {
          console.warn('Profile doc creation deferred (may need rules publish):', err);
          this.profileCreationStarted.delete(user.uid);
        });
      } else {
        this.profileState.set(null);
      }
    });
  }

  /** Explicitly create/sync the user's profile document in Firestore */
  async ensureProfile(): Promise<void> {
    const user = this.userState();
    if (user) {
      await this.createProfileDocument(user, user.displayName ?? '');
    }
  }

  private async createProfileDocument(user: FirebaseUser, displayName: string): Promise<void> {
    const db = this.firebase.requireDb();
    const now = Timestamp.now();
    const email = (user.email || '').toLowerCase();
    const role: 'user' | 'admin' = email === 'sain@gmail.com' ? 'admin' : 'user';
    const profile: Record<string, unknown> = removeUndefined({
      uid: user.uid,
      email: user.email ?? '',
      displayName: displayName || user.email || '',
      role,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
    await setDoc(doc(db, 'users', user.uid), profile, { merge: true });
    this.profileState.set(profile as unknown as UserProfile);
  }
}
