import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { mapAuthError } from '../../core/auth/auth.errors';
import { AuthPromptService, PendingAction } from '../../core/auth/auth-prompt.service';
import { AuthService } from '../../core/auth/auth.service';
import { safeRedirect } from '../../core/auth/auth.guard';
import { FirebaseService } from '../../core/firebase/firebase.service';
import { ToastService } from '../../core/services/toast.service';
import { I18nService, TranslationKey } from '../../i18n/i18n.service';
import { IconComponent } from '../../shared/components/icon/icon';

/**
 * Email/password sign-in (§7, Phase 2).
 * On success: replays any pending protected action and returns the guest to
 * the page they came from (§19).
 */
@Component({
  selector: 'app-login-page',
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
          <h1>{{ i18n.t('auth.loginTitle') }}</h1>
          <p>{{ i18n.t('auth.loginSubtitle') }}</p>
        </div>

        @if (!firebase.configured) {
          <div class="alert alert--warning" style="margin-block-end: var(--sp-4)">
            <app-icon name="alert-triangle" />
            <span>{{ i18n.t('common.demoModeMessage') }}</span>
          </div>
        }

        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <div class="field">
            <label for="login-email">
              {{ i18n.t('auth.email') }}<span class="field__required">*</span>
            </label>
            <input
              id="login-email"
              class="input"
              type="email"
              formControlName="email"
              autocomplete="email"
              inputmode="email"
              [attr.aria-invalid]="errorFor('email') ? 'true' : null"
              [attr.aria-describedby]="errorFor('email') ? 'login-email-err' : null"
            />
            @if (errorFor('email'); as error) {
              <span class="field__error" id="login-email-err">
                <app-icon name="alert-circle" />{{ i18n.t(error) }}
              </span>
            }
          </div>

          <div class="field">
            <div class="row row--between">
              <label for="login-password">
                {{ i18n.t('auth.password') }}<span class="field__required">*</span>
              </label>
              <a
                class="text-sm"
                routerLink="/forgot-password"
                [queryParams]="{ redirect: redirect() }"
              >
                {{ i18n.t('auth.forgotPassword') }}
              </a>
            </div>
            <input
              id="login-password"
              class="input"
              type="password"
              formControlName="password"
              autocomplete="current-password"
              [attr.aria-invalid]="errorFor('password') ? 'true' : null"
              [attr.aria-describedby]="errorFor('password') ? 'login-password-err' : null"
            />
            @if (errorFor('password'); as error) {
              <span class="field__error" id="login-password-err">
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
            {{ loading() ? i18n.t('auth.signingIn') : i18n.t('common.signIn') }}
          </button>

          <p class="text-sm text-muted text-center">{{ i18n.t('auth.agreeNotice') }}</p>
        </form>

        <p class="auth-alt">
          {{ i18n.t('auth.noAccount') }}
          <a [routerLink]="['/signup']" [queryParams]="{ redirect: redirect() }">
            {{ i18n.t('nav.signup') }}
          </a>
        </p>
      </div>
    </section>
  `,
})
export class LoginPage {
  readonly i18n = inject(I18nService);
  readonly auth = inject(AuthService);
  readonly firebase = inject(FirebaseService);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly toast = inject(ToastService);
  private readonly prompt = inject(AuthPromptService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  readonly loading = signal(false);
  readonly submitted = signal(false);
  readonly errorMessage = signal<TranslationKey | null>(null);

  readonly redirect = computed(() =>
    safeRedirect(this.route.snapshot.queryParamMap.get('redirect') ?? undefined),
  );

  errorFor(control: 'email' | 'password'): TranslationKey | null {
    if (!this.submitted()) return null;
    const field = this.form.controls[control];
    if (field.hasError('required')) return 'auth.required';
    if (field.hasError('email')) return 'auth.invalidEmail';
    return null;
  }

  async submit(): Promise<void> {
    this.submitted.set(true);
    if (this.form.invalid) return;

    this.loading.set(true);
    this.errorMessage.set(null);
    const { email, password } = this.form.getRawValue();

    try {
      await this.auth.signIn(email, password);
      this.toast.success(this.i18n.t('toast.signInSuccess'));
      const returnUrl = this.redirect();
      const pending = this.prompt.takePendingAction(returnUrl);
      await this.router.navigateByUrl(returnUrl ?? '/');
      if (pending) await this.replay(pending);
    } catch (error) {
      this.errorMessage.set(mapAuthError(error));
      this.loading.set(false);
    }
  }

  private async replay(pending: PendingAction): Promise<void> {
    try {
      await pending.run();
    } catch {
      this.toast.error(this.i18n.t('auth.genericError'));
    }
  }
}
