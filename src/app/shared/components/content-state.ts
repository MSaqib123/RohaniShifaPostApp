import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { I18nService } from '../../i18n/i18n.service';
import { IconComponent } from './icon/icon';

export type ContentStateKind = 'loading' | 'empty' | 'error';

/**
 * The single loading/empty/error surface (§33).
 *
 * Every list and detail view renders one of these three honest states instead
 * of a blank screen or a spinner that never resolves — and `error` always
 * offers a real retry (§61).
 *
 * ```html
 * <app-content-state kind="empty" icon="post" [title]="…" [message]="…" />
 * ```
 */
@Component({
  selector: 'app-content-state',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="state" [class.state--error]="kind() === 'error'" [attr.role]="role()">
      @if (kind() === 'loading') {
        <span class="spinner" aria-hidden="true"></span>
        <p>{{ title() || i18n.t('common.loadingContent') }}</p>
      } @else {
        <app-icon [name]="icon()" />
        <h3>{{ title() }}</h3>
        <p>{{ message() }}</p>
        @if (kind() === 'error') {
          <button type="button" class="btn btn--outline btn--sm" (click)="retry.emit()">
            {{ i18n.t('common.retry') }}
          </button>
        }
      }
    </div>
  `,
})
export class ContentStateComponent {
  readonly i18n = inject(I18nService);

  readonly kind = input<ContentStateKind>('empty');
  /** Sprite icon name — ignored while loading. */
  readonly icon = input('sparkle');
  readonly title = input('');
  readonly message = input('');
  /** Fired by the retry button in the `error` state. */
  readonly retry = output<void>();

  protected role(): 'status' | 'alert' | null {
    if (this.kind() === 'error') return 'alert';
    if (this.kind() === 'loading') return 'status';
    return null;
  }
}
