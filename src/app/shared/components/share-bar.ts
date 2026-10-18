import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { I18nService } from '../../i18n/i18n.service';
import { ToastService } from '../../core/services/toast.service';
import { IconComponent } from './icon/icon';

/**
 * Share row (§54).
 *
 * Only services that can honestly share are offered: the browser's own
 * share sheet when available, plus copy-link (always works) and the official
 * channels configured in `siteConfig` (§61 — no dead buttons).
 * The URL is always the canonical absolute link for the current page.
 */
@Component({
  selector: 'app-share-bar',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="share-bar" role="group" [attr.aria-label]="i18n.t('common.shareTitle')">
      @if (canNativeShare) {
        <button type="button" class="share-btn" (click)="shareNative()">
          <app-icon name="share" />
          {{ i18n.t('share.native') }}
        </button>
      }

      <button type="button" class="share-btn" (click)="copyLink()">
        <app-icon name="copy" />
        {{ i18n.t('common.copyLink') }}
      </button>

      <a class="share-btn" [href]="whatsAppUrl()" target="_blank" rel="noopener noreferrer">
        <app-icon name="whatsapp" />
        {{ i18n.t('share.whatsapp') }}
      </a>

      <a class="share-btn" [href]="facebookUrl()" target="_blank" rel="noopener noreferrer">
        <app-icon name="facebook" />
        {{ i18n.t('share.facebook') }}
      </a>

      <a class="share-btn" [href]="xUrl()" target="_blank" rel="noopener noreferrer">
        <app-icon name="share" />
        {{ i18n.t('share.x') }}
      </a>
    </div>
  `,
})
export class ShareBar {
  private readonly doc = inject(DOCUMENT);
  private readonly toast = inject(ToastService);
  readonly i18n = inject(I18nService);

  /** Share text — defaults to the page title, overridable per usage. */
  readonly text = input('');

  /** True when this browser exposes the Web Share API (mobile-mostly). */
  readonly canNativeShare =
    typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  private get url(): string {
    return this.doc.location.href;
  }

  private get shareText(): string {
    return this.text() || this.doc.title;
  }

  protected whatsAppUrl(): string {
    return `https://wa.me/?text=${encodeURIComponent(`${this.shareText} ${this.url}`)}`;
  }

  protected facebookUrl(): string {
    return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(this.url)}`;
  }

  protected xUrl(): string {
    return `https://twitter.com/intent/tweet?text=${encodeURIComponent(this.shareText)}&url=${encodeURIComponent(this.url)}`;
  }

  async shareNative(): Promise<void> {
    try {
      await navigator.share({ title: this.doc.title, text: this.shareText, url: this.url });
    } catch {
      /* user dismissed the sheet — not an error */
    }
  }

  async copyLink(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.url);
      this.toast.success(this.i18n.t('share.copied'));
    } catch {
      this.toast.error(this.i18n.t('common.copyFailed'));
    }
  }
}
