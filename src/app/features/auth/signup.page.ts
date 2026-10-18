import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { mapAuthError } from '../../core/auth/auth.errors';
import { AuthPromptService, PendingAction } from '../../core/auth/auth-prompt.service';
import { AuthService } from '../../core/auth/auth.service';
import { safeRedirect } from '../../core/auth/auth.guard';
import { FirebaseService } from '../../core/firebase/firebase.service';
import { ToastService } from '../../core/services/toast.service';
import { I18nService, TranslationKey } from '../../i18n/i18n.service';
import { IconComponent } from '../../shared/components/icon/icon';

/** Cross-field validator: password + confirmation must match (§23 patterns). */
function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value;
  const confirmation = group.get('confirmPassword')?.value;
  return password && confirmation && password !== confirmation ? { passwordMismatch: true } : null;
}

/**
 * Email/password sign-up (§7, Phase 2): creates the Auth user, the
 * `users/{uid}` profile (role `user`, enforced by rules) and sends a
 * verification email. Replays any pending protected action afterwards.
 */
@Component({
  selector: 'app-signup-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="auth-page container">
      <div class="auth-card">
        <div class="auth-card__head">
          <div class="auth-card__badge" aria-hidden="true">
            <app-icon name="mosque" />
          </div>
          <h1>{{ i18n.t('auth.signupTitle') }}</h1>
          <p>{{ i18n.t('auth.signupSubtitle') }}</p>
        </div>

        @if (!firebase.configured) {
          <div class="alert alert--warning" style="margin-block-end: var(--sp-4)">
            <app-icon name="alert-triangle" />
            <span>{{ i18n.t('common.demoModeMessage') }}</span>
          </div>
        }

        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <div class="field">
            <label for="signup-name">
              {{ i18n.t('auth.displayName') }}<span class="field__required">*</span>
            </label>
            <input
              id="signup-name"
              class="input"
              type="text"
              formControlName="displayName"
              autocomplete="name"
              [attr.aria-invalid]="errorFor('displayName') ? 'true' : null"
              [attr.aria-describedby]="errorFor('displayName') ? 'signup-name-err' : null"
            />
            @if (errorFor('displayName'); as error) {
              <span class="field__error" id="signup-name-err">
                <app-icon name="alert-circle" />{{ i18n.t(error) }}
              </span>
            }
          </div>

          <div class="field">
            <label for="signup-email">
              {{ i18n.t('auth.email') }}<span class="field__required">*</span>
            </label>
            <input
              id="signup-email"
              class="input"
              type="email"
              formControlName="email"
              autocomplete="email"
              inputmode="email"
              [attr.aria-invalid]="errorFor('email') ? 'true' : null"
              [attr.aria-describedby]="errorFor('email') ? 'signup-email-err' : null"
            />
            @if (errorFor('email'); as error) {
              <span class="field__error" id="signup-email-err">
                <app-icon name="alert-circle" />{{ i18n.t(error) }}
              </span>
            }
          </div>

          <div class="field">
            <label for="signup-password">
              {{ i18n.t('auth.password') }}<span class="field__required">*</span>
            </label>
            <input
              id="signup-password"
              class="input"
              type="password"
              formControlName="password"
              autocomplete="new-password"
              [attr.aria-invalid]="errorFor('password') ? 'true' : null"
              [attr.aria-describedby]="errorFor('password') ? 'signup-password-err' : null"
            />
            @if (errorFor('password'); as error) {
              <span class="field__error" id="signup-password-err">
                <app-icon name="alert-circle" />{{ i18n.t(error) }}
              </span>
            }
          </div>

          <div class="field">
            <label for="signup-confirm">
              {{ i18n.t('auth.confirmPassword') }}<span class="field__required">*</span>
            </label>
            <input
              id="signup-confirm"
              class="input"
              type="password"
              formControlName="confirmPassword"
              autocomplete="new-password"
              [attr.aria-invalid]="confirmationError() ? 'true' : null"
              [attr.aria-describedby]="confirmationError() ? 'signup-confirm-err' : null"
            />
            @if (confirmationError(); as error) {
              <span class="field__error" id="signup-confirm-err">
                <app-icon name="alert-circle" />{{ i18n.t(error) }}
              </span>
            }
          </div>

          @if (errorMessage(); as error) {
            <div class="alert alert--danger" role="alert">
              <app-icon name="alert-circle" />
              <span>{{ i18n.t(error) }}</span>
            </div>
          }

          <button class="btn btn--block" type="submit" [disabled]="loading()">
            @if (loading()) {
              <span class="btn-spinner" aria-hidden="true"></span>
            }
            {{ loading() ? i18n.t('auth.creatingAccount') : i18n.t('auth.createAccount') }}
          </button>

          <p class="text-sm text-muted text-center">{{ i18n.t('auth.agreeNotice') }}</p>
        </form>

        <p class="auth-alt">
          {{ i18n.t('auth.alreadyAccount') }}
          <a [routerLink]="['/login']" [queryParams]="{ redirect: redirect() }">
            {{ i18n.t('nav.login') }}
          </a>
        </p>
      </div>
    </section>
  `,
})
export class SignupPage {
  readonly i18n = inject(I18nService);
  readonly auth = inject(AuthService);
  readonly firebase = inject(FirebaseService);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly toast = inject(ToastService);
  private readonly prompt = inject(AuthPromptService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly form = this.fb.group(
    {
      displayName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: passwordsMatch },
  );

  readonly loading = signal(false);
  readonly submitted = signal(false);
  readonly errorMessage = signal<TranslationKey | null>(null);

  readonly redirect = computed(() =>
    safeRedirect(this.route.snapshot.queryParamMap.get('redirect') ?? undefined),
  );

  errorFor(control: 'displayName' | 'email' | 'password'): TranslationKey | null {
    if (!this.submitted()) return null;
    const field = this.form.controls[control];
    if (field.hasError('required')) return 'auth.required';
    if (field.hasError('email')) return 'auth.invalidEmail';
    if (field.hasError('minlength')) {
      return control === 'password' ? 'auth.passwordMin' : 'auth.nameMin';
    }
    return null;
  }

  confirmationError(): TranslationKey | null {
    if (!this.submitted()) return null;
    if (this.form.controls['confirmPassword'].hasError('required')) {
      return 'auth.required';
    }
    return this.form.hasError('passwordMismatch') ? 'auth.passwordMismatch' : null;
  }

  async submit(): Promise<void> {
    this.submitted.set(true);
    if (this.form.invalid) return;

    this.loading.set(true);
    this.errorMessage.set(null);
    const { displayName, email, password } = this.form.getRawValue();

    try {
      await this.auth.signUp({ email, password, displayName });
      this.toast.success(this.i18n.t('toast.signUpSuccess'));
      this.toast.warning(this.i18n.t('auth.verifyEmailNotice'));

      const returnUrl = this.redirect();
      const pending = this.prompt.takePendingAction(returnUrl);
      await this.router.navigateByUrl(returnUrl ?? '/');
      if (pending) {
        try {
          await pending.run();
        } catch {
          this.toast.error(this.i18n.t('auth.genericError'));
        }
      }
    } catch (error) {
      this.errorMessage.set(mapAuthError(error));
      this.loading.set(false);
    }
  }
}
