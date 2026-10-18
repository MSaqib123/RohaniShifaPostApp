import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { mapAuthError } from '../../core/auth/auth.errors';
import { AuthService } from '../../core/auth/auth.service';
import { safeRedirect } from '../../core/auth/auth.guard';
import { FirebaseService } from '../../core/firebase/firebase.service';
import { I18nService, TranslationKey } from '../../i18n/i18n.service';
import { IconComponent } from '../../shared/components/icon/icon';

/** Password reset via Firebase email link (§7, Phase 2). */
@Component({
  selector: 'app-forgot-password-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="auth-page container">
      <div class="auth-card">
        <div class="auth-card__head">
          <h1>{{ i18n.t('auth.forgotTitle') }}</h1>
          <p>{{ i18n.t('auth.forgotSubtitle') }}</p>
        </div>

        @if (!firebase.configured) {
          <div class="alert alert--warning" style="margin-block-end: var(--sp-4)">
            <app-icon name="alert-triangle" />
            <span>{{ i18n.t('common.demoModeMessage') }}</span>
          </div>
        }

        @if (sent()) {
          <div class="alert alert--success" role="status">
            <app-icon name="check-circle" />
            <span>{{ i18n.t('auth.resetEmailSent') }}</span>
          </div>
        } @else {
          <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
            <div class="field">
              <label for="reset-email">
                {{ i18n.t('auth.email') }}<span class="field__required">*</span>
              </label>
              <input
                id="reset-email"
                class="input"
                type="email"
                formControlName="email"
                autocomplete="email"
                inputmode="email"
                [attr.aria-invalid]="error() ? 'true' : null"
                [attr.aria-describedby]="error() ? 'reset-email-err' : null"
              />
              @if (error(); as fieldError) {
                <span class="field__error" id="reset-email-err">
                  <app-icon name="alert-circle" />{{ i18n.t(fieldError) }}
                </span>
              }
            </div>

            @if (errorMessage(); as formError) {
              <div class="alert alert--danger" role="alert">
                <app-icon name="alert-circle" />
                <span>{{ i18n.t(formError) }}</span>
              </div>
            }

            <button class="btn btn--block" type="submit" [disabled]="loading()">
              @if (loading()) {
                <span class="btn-spinner" aria-hidden="true"></span>
              }
              {{ loading() ? i18n.t('common.saving') : i18n.t('auth.sendResetLink') }}
            </button>
          </form>
        }

        <p class="auth-alt">
          <a [routerLink]="['/login']" [queryParams]="{ redirect: redirect() }">
            <app-icon name="arrow-left" style="inline-size: 0.95rem; block-size: 0.95rem" />
            {{ i18n.t('auth.backToLogin') }}
          </a>
        </p>
      </div>
    </section>
  `,
})
export class ForgotPasswordPage {
  readonly i18n = inject(I18nService);
  readonly firebase = inject(FirebaseService);
  private readonly auth = inject(AuthService);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly route = inject(ActivatedRoute);

  readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  readonly loading = signal(false);
  readonly submitted = signal(false);
  readonly sent = signal(false);
  readonly errorMessage = signal<TranslationKey | null>(null);

  readonly redirect = computed(() =>
    safeRedirect(this.route.snapshot.queryParamMap.get('redirect') ?? undefined),
  );

  error(): TranslationKey | null {
    if (!this.submitted()) return null;
    const field = this.form.controls['email'];
    if (field.hasError('required')) return 'auth.required';
    if (field.hasError('email')) return 'auth.invalidEmail';
    return null;
  }

  async submit(): Promise<void> {
    this.submitted.set(true);
    if (this.form.invalid) return;

    this.loading.set(true);
    this.errorMessage.set(null);
    try {
      await this.auth.sendPasswordReset(this.form.controls['email'].value.trim());
      this.sent.set(true);
    } catch (error) {
      this.errorMessage.set(mapAuthError(error));
    } finally {
      this.loading.set(false);
    }
  }
}
