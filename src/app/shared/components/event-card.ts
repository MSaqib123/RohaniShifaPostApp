import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EventItem } from '../../core/models';
import { I18nService } from '../../i18n/i18n.service';
import { AppDatePipe } from '../pipes/app-date.pipe';
import { IconComponent } from './icon/icon';

/**
 * Event card (§17).
 *
 * Distinguishes upcoming from archived at a glance and always exposes the
 * real state: a cancelled event says so instead of pretending to be live.
 */
@Component({
  selector: 'app-event-card',
  standalone: true,
  imports: [RouterLink, IconComponent, AppDatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="card card--interactive event-card" [class.event-card--past]="isPast()">
      <div class="event-card__date" aria-hidden="true">
        <span class="event-card__day">{{ dayOfMonth() }}</span>
        <span class="event-card__month">{{ monthLabel() }}</span>
      </div>

      <div class="card__body">
        <div class="card__meta">
          @if (event().status === 'cancelled') {
            <span class="badge badge--danger">{{ i18n.t('events.cancelled') }}</span>
          } @else if (isPast()) {
            <span class="badge badge--muted">{{ i18n.t('events.completed') }}</span>
          } @else {
            <span class="badge">{{ i18n.t('events.upcoming') }}</span>
          }
          <span class="event-card__mode">
            <app-icon [name]="event().isOnline ? 'globe' : 'map-pin'" />
            {{ event().isOnline ? i18n.t('events.online') : i18n.t('events.offline') }}
          </span>
        </div>

        <h3 class="card__title">
          <a [routerLink]="['/events', event().id]">{{ title() }}</a>
        </h3>

        <p class="event-card__when">
          <app-icon name="calendar" />
          {{ event().startDate | appDate: 'medium' }}
        </p>

        @if (event().location; as location) {
          <p class="event-card__where">
            <app-icon name="map-pin" />
            {{ location }}
          </p>
        }

        <div class="card__actions">
          <a class="btn btn--ghost btn--sm" [routerLink]="['/events', event().id]">
            {{ i18n.t('common.viewDetails') }}
            <app-icon name="arrow-right" />
          </a>
        </div>
      </div>
    </article>
  `,
  styleUrl: './event-card.scss',
})
export class EventCard {
  readonly i18n = inject(I18nService);

  readonly event = input.required<EventItem>();

  readonly title = computed(
    () => this.i18n.localized(this.event().title) || this.i18n.t('common.untitled'),
  );

  readonly isPast = computed(() => this.event().startDate.toDate().getTime() < Date.now());

  readonly dayOfMonth = computed(() =>
    new Intl.DateTimeFormat(this.i18n.localeOf(), { day: '2-digit' }).format(
      this.event().startDate.toDate(),
    ),
  );

  readonly monthLabel = computed(() =>
    new Intl.DateTimeFormat(this.i18n.localeOf(), { month: 'short' })
      .format(this.event().startDate.toDate())
      .toUpperCase(),
  );
}
