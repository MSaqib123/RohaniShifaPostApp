import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { AuthService } from '../core/auth/auth.service';
import { FirebaseService } from '../core/firebase/firebase.service';
import { I18nService } from './i18n.service';
import { SupportedLanguage } from './language.types';
import { IconComponent } from '../shared/components/icon/icon';

/**
 * Language switcher with radio-group semantics (§5).
 * Switching updates dictionary + document `lang`/`dir` instantly and, when
 * signed in, syncs the preference to the user profile (best effort).
 */
@Component({
  selector: 'app-language-switcher',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="menu-anchor" #anchor>
      <button
        type="button"
        class="lang-btn"
        (click)="open.set(!open())"
        [attr.aria-expanded]="open()"
        [attr.aria-controls]="menuId"
        [attr.aria-label]="i18n.t('nav.languageChange')"
        [title]="i18n.t('nav.languageChange')"
      >
        <app-icon name="globe" />
        <span class="lang-btn__label">{{ i18n.currentLanguageOption().nativeLabel }}</span>
        <app-icon [name]="open() ? 'chevron-up' : 'chevron-down'" />
      </button>

      @if (open()) {
        <div
          class="menu-panel lang-menu"
          [id]="menuId"
          role="radiogroup"
          [attr.aria-label]="i18n.t('nav.language')"
        >
          @for (option of i18n.languages; track option.code) {
            <button
              type="button"
              role="radio"
              [attr.aria-checked]="i18n.language() === option.code"
              (click)="select(option.code)"
            >
              <span>{{ option.nativeLabel }}</span>
              <span class="lang-menu__en">{{ option.label }}</span>
              @if (i18n.language() === option.code) {
                <app-icon name="check" />
              }
            </button>
          }
        </div>
      }
    </div>
  `,
})
export class LanguageSwitcher {
  readonly i18n = inject(I18nService);
  private readonly auth = inject(AuthService);
  private readonly firebase = inject(FirebaseService);

  readonly open = signal(false);
  private readonly anchor = viewChild<ElementRef<HTMLElement>>('anchor');

  readonly menuId = `lang-menu-${Math.random().toString(36).slice(2, 8)}`;

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.close();
  }

  /** Close when clicking anywhere outside the switcher. */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const host = this.anchor()?.nativeElement;
    if (host && !host.contains(event.target as Node)) {
      this.close();
    }
  }

  async select(code: SupportedLanguage): Promise<void> {
    this.close();
    await this.i18n.setLanguage(code);
    // Persist preference for signed-in users (best effort, never blocking).
    if (this.firebase.configured && this.auth.isLoggedIn()) {
      void this.auth.updateOwnProfile({ language: code }).catch(() => undefined);
    }
  }

  private close(): void {
    this.open.set(false);
  }
}
