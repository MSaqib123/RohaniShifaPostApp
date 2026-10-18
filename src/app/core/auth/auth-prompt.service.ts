import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { I18nService } from '../../i18n/i18n.service';
import { LoginPromptDialog } from '../../shared/components/login-prompt-dialog/login-prompt-dialog';
import { ToastService } from '../services/toast.service';
import { AuthService } from './auth.service';
import { FirebaseService } from '../firebase/firebase.service';

/** A protected action remembered until the user signs in (§19). */
export interface PendingAction {
  /** Already-translated description shown while the action is pending. */
  label: string;
  /** Executed after successful authentication (or immediately if signed in). */
  run: () => void | Promise<void>;
  /** Page the guest was on — replay only matches that same return URL. */
  returnUrl: string;
  createdAt: number;
}

const PENDING_TTL_MS = 10 * 60 * 1000;

/**
 * Implements the guest → login dialog → return → replay flow (§19):
 *
 * ```text
 * Guest taps Like  →  "Sign in required" dialog  →  /login?redirect=<page>
 *        →  sign in  →  back on original page  →  the like executes
 * ```
 *
 * The intended action is never lost, exactly as required by the spec.
 */
@Injectable({ providedIn: 'root' })
export class AuthPromptService {
  private readonly overlay = inject(Overlay);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly firebase = inject(FirebaseService);
  private readonly toast = inject(ToastService);
  private readonly i18n = inject(I18nService);

  private pending: PendingAction | null = null;
  private overlayRef: OverlayRef | null = null;

  readonly isOpen = signal(false);
  readonly hasPendingAction = computed(() => this.pending !== null);

  /**
   * Gate a protected action. Returns `true` when it ran immediately;
   * otherwise stores it, shows the login dialog, and returns `false`.
   */
  async require(label: string, run: () => void | Promise<void>): Promise<boolean> {
    if (!this.firebase.configured) {
      this.toast.info(this.i18n.t('common.demoModeMessage'));
      return false;
    }
    if (this.auth.isLoggedIn()) {
      await run();
      return true;
    }
    this.pending = { label, run, returnUrl: this.router.url, createdAt: Date.now() };
    this.open();
    return false;
  }

  /** Dialog → sign-in page (pending action is kept for replay). */
  proceedToLogin(): void {
    const returnUrl = this.pending?.returnUrl ?? this.router.url;
    this.close();
    void this.router.navigate(['/login'], { queryParams: { redirect: returnUrl } });
  }

  /** Dialog → sign-up page (pending action is kept for replay). */
  proceedToSignUp(): void {
    const returnUrl = this.pending?.returnUrl ?? this.router.url;
    this.close();
    void this.router.navigate(['/signup'], { queryParams: { redirect: returnUrl } });
  }

  /** Cancel the dialog: drops the stored action and informs the user. */
  cancelPending(): void {
    this.pending = null;
    this.close();
    this.toast.info(this.i18n.t('toast.actionCancelled'));
  }

  /**
   * Called by the login/signup page after successful authentication.
   * Replays the stored action only when it belongs to the same return URL
   * (and has not expired), then returns it for navigation purposes.
   */
  takePendingAction(returnUrl: string | null): PendingAction | null {
    const pending = this.pending;
    this.pending = null;
    if (!pending) return null;
    if (Date.now() - pending.createdAt > PENDING_TTL_MS) return null;
    if (pending.returnUrl !== returnUrl) return null;
    return pending;
  }

  /** Drop any stored action without a toast (sign-out, navigation resets). */
  clearPending(): void {
    this.pending = null;
  }

  open(): void {
    if (this.overlayRef) return;
    const overlayRef = this.overlay.create({
      hasBackdrop: true,
      backdropClass: 'app-dialog-backdrop',
      panelClass: 'app-dialog-host',
      positionStrategy: this.overlay.position().global().centerHorizontally().centerVertically(),
      scrollStrategy: this.overlay.scrollStrategies.block(),
    });
    overlayRef.backdropClick().subscribe(() => this.cancelPending());
    overlayRef.keydownEvents().subscribe((event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        this.cancelPending();
      }
    });
    overlayRef.attach(new ComponentPortal(LoginPromptDialog));
    this.overlayRef = overlayRef;
    this.isOpen.set(true);
  }

  close(): void {
    this.overlayRef?.detach();
    this.overlayRef?.dispose();
    this.overlayRef = null;
    this.isOpen.set(false);
  }
}
