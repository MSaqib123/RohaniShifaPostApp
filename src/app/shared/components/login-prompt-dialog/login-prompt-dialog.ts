import { CdkTrapFocus } from '@angular/cdk/a11y';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AuthPromptService } from '../../../core/auth/auth-prompt.service';
import { I18nService } from '../../../i18n/i18n.service';
import { IconComponent } from '../icon/icon';

/**
 * "Sign in required" dialog shown when a guest attempts a protected action
 * (§19). Choosing to continue stores the intended action and navigates to the
 * login page; after authentication the action replays on the original page.
 */
@Component({
  selector: 'app-login-prompt-dialog',
  standalone: true,
  imports: [IconComponent, CdkTrapFocus],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="app-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-prompt-title"
      aria-describedby="login-prompt-desc"
      [cdkTrapFocus]="true"
      [cdkTrapFocusAutoCapture]="true"
    >
      <span class="login-prompt__icon" aria-hidden="true">
        <app-icon name="user" />
      </span>
      <h2 id="login-prompt-title">{{ i18n.t('common.loginRequiredTitle') }}</h2>
      <p id="login-prompt-desc">{{ i18n.t('common.loginRequiredMessage') }}</p>
      <div class="dialog-actions">
        <button type="button" class="btn btn--ghost" (click)="prompt.cancelPending()">
          {{ i18n.t('common.cancel') }}
        </button>
        <button type="button" class="btn btn--outline" (click)="prompt.proceedToSignUp()">
          {{ i18n.t('nav.signup') }}
        </button>
        <button type="button" class="btn" (click)="prompt.proceedToLogin()">
          {{ i18n.t('common.signIn') }}
        </button>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .login-prompt__icon {
        display: grid;
        place-items: center;
        inline-size: 3rem;
        block-size: 3rem;
        margin-block-end: var(--sp-4);
        border-radius: 50%;
        background: var(--c-primary-50);
        color: var(--c-primary-700);
      }
      .login-prompt__icon .icon {
        inline-size: 1.5rem;
        block-size: 1.5rem;
      }
      h2 {
        font-size: var(--fs-xl);
        margin-block-end: var(--sp-2);
      }
      p {
        color: var(--text-muted);
      }
    `,
  ],
})
export class LoginPromptDialog {
  readonly prompt = inject(AuthPromptService);
  readonly i18n = inject(I18nService);
}
