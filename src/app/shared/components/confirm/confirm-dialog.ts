import { CdkTrapFocus } from '@angular/cdk/a11y';
import { ChangeDetectionStrategy, Component, EventEmitter, inject, input } from '@angular/core';
import { I18nService } from '../../../i18n/i18n.service';

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Red destructive styling for delete-style confirmations. */
  danger?: boolean;
}

/**
 * Modal confirmation used for every destructive operation (§35).
 * Opened programmatically by `ConfirmService`; resolves with the user's choice.
 */
@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CdkTrapFocus],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [':host { display: block; }'],
  template: `
    <div
      class="app-dialog"
      role="alertdialog"
      aria-modal="true"
      [attr.aria-labelledby]="titleId"
      [attr.aria-describedby]="options().message ? descriptionId : null"
      [cdkTrapFocus]="true"
      [cdkTrapFocusAutoCapture]="true"
    >
      <h2 [id]="titleId">{{ options().title }}</h2>
      @if (options().message) {
        <p [id]="descriptionId">{{ options().message }}</p>
      }
      <div class="dialog-actions">
        <button type="button" class="btn btn--ghost" (click)="confirmed.emit(false)">
          {{ options().cancelLabel || i18n.t('common.cancel') }}
        </button>
        <button
          type="button"
          class="btn"
          [class.btn--danger]="options().danger ?? false"
          (click)="confirmed.emit(true)"
        >
          {{ options().confirmLabel || i18n.t('common.confirm') }}
        </button>
      </div>
    </div>
  `,
})
export class ConfirmDialog {
  readonly options = input.required<ConfirmOptions>();
  readonly confirmed = new EventEmitter<boolean>();
  readonly i18n = inject(I18nService);

  readonly titleId = `confirm-title-${Math.random().toString(36).slice(2, 8)}`;
  readonly descriptionId = `confirm-desc-${Math.random().toString(36).slice(2, 8)}`;
}
