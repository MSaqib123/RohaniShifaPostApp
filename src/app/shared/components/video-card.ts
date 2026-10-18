import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Video } from '../../core/models';
import { I18nService } from '../../i18n/i18n.service';
import { youtubeThumbnailUrl } from '../../core/services/youtube';
import { AppDatePipe } from '../pipes/app-date.pipe';
import { IconComponent } from './icon/icon';

/**
 * YouTube video preview card (§13, §53).
 *
 * The thumbnail is a static `i.ytimg.com` image (no iframe until the visitor
 * opens the video), which keeps list pages light and avoids loading YouTube
 * scripts on every scroll.
 */
@Component({
  selector: 'app-video-card',
  standalone: true,
  imports: [RouterLink, IconComponent, AppDatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="card card--interactive">
      <a
        class="card__media"
        [routerLink]="['/videos', post().id]"
        [attr.aria-label]="title()"
        tabindex="-1"
        aria-hidden="true"
      >
        <img [src]="thumbnail()" [alt]="''" loading="lazy" />
        <span class="play-badge" aria-hidden="true"
          ><span><app-icon name="play" filled /></span
        ></span>
      </a>
      <div class="card__body">
        <div class="card__meta">
          @if (post().publishedAt; as published) {
            <span class="video-card__date">
              <app-icon name="calendar" />
              {{ published | appDate }}
            </span>
          }
          @if (post().featured) {
            <span class="badge badge--gold">{{ i18n.t('common.featured') }}</span>
          }
        </div>
        <h3 class="card__title">
          <a [routerLink]="['/videos', post().id]">{{ title() }}</a>
        </h3>
        @if (description(); as text) {
          <p class="video-card__excerpt">{{ text }}</p>
        }
        <div class="card__actions">
          <a class="btn btn--ghost btn--sm" [routerLink]="['/videos', post().id]">
            <app-icon name="play" filled />
            {{ i18n.t('common.watch') }}
          </a>
        </div>
      </div>
    </article>
  `,
  styleUrl: './video-card.scss',
})
export class VideoCard {
  readonly i18n = inject(I18nService);

  /** Named `post()` so card markup mirrors PostCard — both are content items. */
  readonly post = input.required<Video>();

  readonly title = computed(
    () => this.i18n.localized(this.post().title) || this.i18n.t('common.untitled'),
  );
  readonly description = computed(() => this.i18n.localized(this.post().description));
  readonly thumbnail = computed(
    () => this.post().thumbnailUrl || youtubeThumbnailUrl(this.post().youtubeId),
  );
}
