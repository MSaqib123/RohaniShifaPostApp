import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { I18nService } from '../../i18n/i18n.service';
import { ConfirmService } from '../services/confirm.service';
import { ToastService } from '../services/toast.service';
import { AuthPromptService } from './auth-prompt.service';
import { AuthService } from './auth.service';

/**
 * Sign-out flow shared by the public header and the admin frame (DRY, §65):
 * confirmation dialog → clear pending action → sign out → toast → home.
 */
@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly auth = inject(AuthService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  private readonly i18n = inject(I18nService);
  private readonly router = inject(Router);
  private readonly prompt = inject(AuthPromptService);

  async logout(): Promise<void> {
    const confirmed = await this.confirm.confirm({
      title: this.i18n.t('auth.logoutConfirmTitle'),
      message: this.i18n.t('auth.logoutConfirmMessage'),
      confirmLabel: this.i18n.t('confirm.logout'),
    });
    if (!confirmed) return;

    this.prompt.clearPending();
    try {
      await this.auth.signOut();
      this.toast.success(this.i18n.t('toast.signedOut'));
      void this.router.navigate(['/']);
    } catch {
      this.toast.error(this.i18n.t('auth.genericError'));
    }
  }
}
