import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { youtubeEmbedUrl, youtubeWatchUrl } from '../../core/services/youtube';
import { I18nService } from '../../i18n/i18n.service';
import { IconComponent } from './icon/icon';

/**
 * Click-to-load YouTube embed (§13).
 *
 * Shows a thumbnail first and only inserts the iframe after an explicit click,
 * so YouTube's third-party scripts and cookies stay off the page until the
 * visitor actually asks for the video (§59 — privacy-conscious by default).
 *
 * ```html
 * <app-youtube-player [youtubeId]="video.youtubeId" />
 * ```
 */
@Component({
  selector: 'app-youtube-player',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="player">
      @if (playing()) {
        <iframe
          [src]="embedUrl()"
          [title]="label()"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen
        ></iframe>
      } @else {
        <button
          type="button"
          class="player__trigger"
          (click)="playing.set(true)"
          [attr.aria-label]="label()"
        >
          <img [src]="thumbnail()" alt="" loading="lazy" />
          <span class="play-badge" aria-hidden="true">
            <span><app-icon name="play" filled /></span>
          </span>
        </button>
        <p class="player__note">{{ i18n.t('videos.embedNote') }}</p>
      }

      <a class="player__open" [href]="watchUrl()" target="_blank" rel="noopener noreferrer">
        <app-icon name="external" />
        {{ i18n.t('videos.openOnYoutube') }}
      </a>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .player {
        position: relative;
        display: grid;
        gap: var(--sp-2);
        justify-items: center;
      }
      .player__trigger {
        position: relative;
        display: block;
        inline-size: 100%;
        padding: 0;
        border: 1px solid var(--c-line);
        border-radius: var(--r-lg);
        overflow: hidden;
        background: var(--c-bg-deep);
        cursor: pointer;
      }
      .player__trigger img {
        display: block;
        inline-size: 100%;
        aspect-ratio: 16 / 9;
        object-fit: cover;
      }
      iframe {
        display: block;
        inline-size: 100%;
        aspect-ratio: 16 / 9;
        border: 1px solid var(--c-line);
        border-radius: var(--r-lg);
        background: #000;
      }
      .player__note {
        margin: 0;
        color: var(--text-faint);
        font-size: var(--fs-xs);
        text-align: center;
      }
      .player__open {
        display: inline-flex;
        align-items: center;
        gap: 0.4em;
        font-size: var(--fs-sm);
        font-weight: 600;
        color: var(--text-muted);
        text-decoration: none;

        &:hover {
          color: var(--c-primary-700);
          text-decoration: none;
        }

        .icon {
          inline-size: 1rem;
          block-size: 1rem;
        }
      }
    `,
  ],
})
export class YouTubePlayerComponent {
  private readonly sanitizer = inject(DomSanitizer);
  readonly i18n = inject(I18nService);

  readonly youtubeId = input.required<string>();

  /** Flipped by the visitor's click — nothing loads before that. */
  readonly playing = signal(false);

  readonly watchUrl = computed(() => youtubeWatchUrl(this.youtubeId()));
  readonly thumbnail = computed(() => `https://i.ytimg.com/vi/${this.youtubeId()}/hqdefault.jpg`);
  readonly embedUrl = computed<SafeResourceUrl>(() =>
    this.sanitizer.bypassSecurityTrustResourceUrl(youtubeEmbedUrl(this.youtubeId())),
  );
  readonly label = computed(() => this.i18n.t('videos.playerLabel'));
}
