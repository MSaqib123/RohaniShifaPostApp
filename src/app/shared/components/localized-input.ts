import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LocalizedText, SupportedLanguage } from '../../i18n/language.types';
import { I18nService } from '../../i18n/i18n.service';

/**
 * Multilingual text editor for `{ en, ur, ar }` content fields (§5).
 *
 * The admin writes in whichever languages they know; untouched languages stay
 * empty and the reader falls back to English automatically — so a partial
 * translation is never rendered as a raw key or a blank space (§61).
 *
 * ```html
 * <app-localized-input labelKey="admin.postForm.title" [(value)]="form.title" />
 * ```
 *
 * Output is a *new* object each edit so OnPush parents re-render reliably.
 */
@Component({
  selector: 'app-localized-input',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="field localized-input">
      <div class="localized-input__head">
        <label class="field__label" [attr.for]="inputId">{{ labelText() }}</label>
        <div class="lang-tabs" role="group" [attr.aria-label]="i18n.t('admin.editingLanguage')">
          @for (lang of languages; track lang.code) {
            <button
              type="button"
              [attr.aria-pressed]="activeLang() === lang.code"
              (click)="activeLang.set(lang.code)"
            >
              {{ lang.nativeLabel }}
            </button>
          }
        </div>
      </div>

      @if (multiline()) {
        <textarea
          [id]="inputId"
          class="textarea"
          rows="6"
          [ngModel]="value()[activeLang()] ?? ''"
          (ngModelChange)="update($event)"
          [attr.aria-label]="labelText()"
        ></textarea>
      } @else {
        <input
          [id]="inputId"
          class="input"
          type="text"
          [ngModel]="value()[activeLang()] ?? ''"
          (ngModelChange)="update($event)"
          [attr.aria-label]="labelText()"
        />
      }

      <p class="field__hint">
        {{ i18n.t('admin.editingLanguageHint') }}
        @if (hintKey(); as key) {
          <span> {{ i18n.t(key) }}</span>
        }
      </p>
    </div>
  `,
  styles: [
    `
      .localized-input__head {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: var(--sp-2);
      }
      .field__hint span {
        display: block;
      }
    `,
  ],
})
export class LocalizedInput {
  readonly i18n = inject(I18nService);

  /** Translation key for the visible label (never hard-coded text). */
  readonly labelKey = input.required<string>();
  /** Optional extra hint translation key. */
  readonly hintKey = input<string | undefined>(undefined);
  readonly multiline = input(false);
  readonly value = input.required<LocalizedText>();

  /** Emits a fresh object per keystroke — parents stay OnPush-safe. */
  readonly valueChange = output<LocalizedText>();

  /** Languages offered by `siteConfig` — add one there to add a tab. */
  readonly languages = this.i18n.languages;

  readonly activeLang = signal<SupportedLanguage>(
    (this.i18n.language() as SupportedLanguage) ?? 'en',
  );

  private readonly idSuffix = Math.random().toString(36).slice(2, 8);
  protected readonly inputId = `loc-${this.idSuffix}`;

  protected readonly labelText = computed(() => this.i18n.t(this.labelKey()));

  protected update(text: string): void {
    const next: LocalizedText = { ...this.value(), [this.activeLang()]: text };
    this.valueChange.emit(next);
  }
}
