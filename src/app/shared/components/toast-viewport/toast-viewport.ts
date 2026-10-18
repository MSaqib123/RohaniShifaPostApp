import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { I18nService } from '../../../i18n/i18n.service';
import { ToastService, ToastType } from '../../../core/services/toast.service';
import { IconComponent } from '../icon/icon';

const ICONS: Record<ToastType, string> = {
  info: 'info',
  success: 'check-circle',
  error: 'alert-circle',
  warning: 'alert-triangle',
};

/**
 * Global toast viewport (§34) — mounted once in the root component.
 * Uses an ARIA live region: errors announce assertively, the rest politely.
 */
@Component({
  selector: 'app-toast-viewport',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="toast-viewport"
      [attr.aria-label]="i18n.t('common.notifications')"
      role="region"
      aria-live="polite"
    >
      @for (toast of toastService.toasts(); track toast.id) {
        <div
          class="toast"
          [class.toast--success]="toast.type === 'success'"
          [class.toast--error]="toast.type === 'error'"
          [class.toast--warning]="toast.type === 'warning'"
          [attr.role]="toast.type === 'error' ? 'alert' : 'status'"
        >
          <span class="toast__icon">
            <app-icon [name]="iconFor(toast.type)" />
          </span>
          <span class="toast__msg">{{ toast.message }}</span>
          <button
            type="button"
            class="toast__close"
            (click)="toastService.dismiss(toast.id)"
            [attr.aria-label]="i18n.t('common.close')"
          >
            <app-icon name="close" />
          </button>
        </div>
      }
    </div>
  `,
})
export class ToastViewport {
  readonly i18n = inject(I18nService);
  readonly toastService = inject(ToastService);

  iconFor(type: ToastType): string {
    return ICONS[type] ?? 'info';
  }
}
