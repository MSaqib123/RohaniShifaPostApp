import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { ThemeMode, ThemeService } from '../../../core/services/theme.service';
import { I18nService } from '../../../i18n/i18n.service';
import { IconComponent } from '../icon/icon';

@Component({
  selector: 'app-theme-switcher',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (mode() === 'segmented') {
      <div class="theme-segmented" role="radiogroup" [attr.aria-label]="i18n.t('profile.themePreference')">
        <button
          type="button"
          class="theme-segmented__btn"
          [class.is-active]="theme.currentMode() === 'light'"
          (click)="theme.setTheme('light')"
          role="radio"
          [attr.aria-checked]="theme.currentMode() === 'light'"
        >
          <app-icon name="sun" />
          <span>{{ i18n.t('theme.light') }}</span>
        </button>

        <button
          type="button"
          class="theme-segmented__btn"
          [class.is-active]="theme.currentMode() === 'dark'"
          (click)="theme.setTheme('dark')"
          role="radio"
          [attr.aria-checked]="theme.currentMode() === 'dark'"
        >
          <app-icon name="moon" />
          <span>{{ i18n.t('theme.dark') }}</span>
        </button>

        <button
          type="button"
          class="theme-segmented__btn"
          [class.is-active]="theme.currentMode() === 'system'"
          (click)="theme.setTheme('system')"
          role="radio"
          [attr.aria-checked]="theme.currentMode() === 'system'"
        >
          <app-icon name="sparkle" />
          <span>{{ i18n.t('theme.system') }}</span>
        </button>
      </div>
    } @else {
      <button
        type="button"
        class="icon-btn theme-toggle-btn"
        (click)="theme.toggleTheme()"
        [attr.aria-label]="theme.isDark() ? i18n.t('theme.light') : i18n.t('theme.dark')"
        [title]="theme.isDark() ? i18n.t('theme.light') : i18n.t('theme.dark')"
      >
        <app-icon [name]="theme.isDark() ? 'sun' : 'moon'" />
      </button>
    }
  `,
  styles: [
    `
      :host {
        display: inline-flex;
        align-items: center;
      }

      .theme-toggle-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 2.35rem;
        height: 2.35rem;
        padding: 0;
        color: var(--c-primary-700);
        background: var(--c-surface-glass);
        border: 1px solid var(--c-line);
        border-radius: var(--r-full);
        box-shadow: var(--shadow-sm);
        cursor: pointer;
        transition: all var(--dur-fast) var(--ease);

        app-icon {
          width: 1.15rem;
          height: 1.15rem;
          transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        &:hover {
          background: var(--c-surface-alt);
          color: var(--c-primary-800);
          border-color: var(--c-primary-500);
          transform: translateY(-1px);
          box-shadow: var(--shadow-md);

          app-icon {
            transform: rotate(35deg) scale(1.1);
          }
        }

        &:active {
          transform: scale(0.92);
        }
      }

      [data-theme='dark'] .theme-toggle-btn {
        color: #fde047;
        background: rgba(254, 240, 138, 0.08);
        border-color: rgba(253, 224, 71, 0.3);

        &:hover {
          background: rgba(254, 240, 138, 0.18);
          color: #ffffff;
          border-color: #fde047;
          box-shadow: 0 0 18px rgba(253, 224, 71, 0.35);
        }
      }

      .theme-segmented {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        padding: 0.25rem;
        background: var(--c-surface-alt);
        border: 1px solid var(--c-line);
        border-radius: var(--r-full);
        width: 100%;
        max-width: 24rem;
      }

      .theme-segmented__btn {
        flex: 1;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.4rem;
        padding: 0.45rem 0.75rem;
        background: transparent;
        border: none;
        border-radius: var(--r-full);
        color: var(--text-muted);
        font-size: var(--fs-sm);
        font-weight: 600;
        cursor: pointer;
        transition: all var(--dur-fast) var(--ease);

        &:hover {
          color: var(--text);
        }

        &.is-active {
          background: var(--c-primary-700);
          color: #ffffff;
          box-shadow: var(--shadow-sm);
        }
      }

      [data-theme='dark'] .theme-segmented__btn.is-active {
        background: linear-gradient(135deg, #0e563f 0%, #062b1e 100%);
        border: 1px solid rgba(212, 175, 55, 0.6);
        color: #f7df96;
      }
    `,
  ],
})
export class ThemeSwitcherComponent {
  readonly i18n = inject(I18nService);
  readonly theme = inject(ThemeService);

  /** 'icon' for header nav, 'segmented' for settings/profile page */
  readonly mode = input<'icon' | 'segmented'>('icon');
}
