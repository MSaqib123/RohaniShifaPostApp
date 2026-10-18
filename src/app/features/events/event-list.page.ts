import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, Observable, catchError, map, of, switchMap, tap } from 'rxjs';
import { EventItem } from '../../core/models';
import { EventService } from '../../core/services/event.service';
import { I18nService } from '../../i18n/i18n.service';
import { ContentStateComponent } from '../../shared/components/content-state';
import { EventCard } from '../../shared/components/event-card';
import { IconComponent } from '../../shared/components/icon/icon';

type Mode = 'upcoming' | 'past' | 'calendar';

interface DayCell {
  /** Day of month, or 0 for the blanks that align the grid. */
  day: number;
  iso: string;
  events: EventItem[];
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, delta: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function toKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * Upcoming events, the past archive and a month calendar (§17, §24).
 *
 * The archive rule is visible in the interface: past events are never removed,
 * they simply move to the *Past* view, and a cancelled event says so on its
 * card instead of pretending to be live.
 */
@Component({
  selector: 'app-event-list-page',
  standalone: true,
  imports: [RouterLink, IconComponent, ContentStateComponent, EventCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './event-list.page.html',
  styleUrl: './event-list.page.scss',
})
export class EventListPage {
  readonly i18n = inject(I18nService);
  private readonly eventService = inject(EventService);

  readonly mode = signal<Mode>('upcoming');
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly events = signal<EventItem[]>([]);

  /** First day of the month shown by the calendar view. */
  readonly month = signal<Date>(startOfMonth(new Date()));
  readonly calendarEvents = signal<EventItem[]>([]);

  private readonly trigger$ = new BehaviorSubject<Mode>('upcoming');

  readonly modes: Array<{
    value: Mode;
    labelKey: 'events.upcoming' | 'events.past' | 'events.calendar';
  }> = [
    { value: 'upcoming', labelKey: 'events.upcoming' },
    { value: 'past', labelKey: 'events.past' },
    { value: 'calendar', labelKey: 'events.calendar' },
  ];

  readonly monthLabel = computed(() =>
    new Intl.DateTimeFormat(this.i18n.localeOf(), { month: 'long', year: 'numeric' }).format(
      this.month(),
    ),
  );

  /** Weekday headers in the active language, always starting on Sunday. */
  readonly weekdayLabels = computed(() => {
    const formatter = new Intl.DateTimeFormat(this.i18n.localeOf(), { weekday: 'short' });
    return Array.from({ length: 7 }, (_, index) => formatter.format(new Date(2024, 0, 7 + index)));
  });

  readonly todayKey = toKey(new Date());

  /**
   * Cells grouped into whole weeks — one ARIA `row` per week (M4).
   * `cells()` is always padded to a multiple of 7, so every row is complete.
   */
  readonly weeks = computed<DayCell[][]>(() => {
    const cells = this.cells();
    const weeks: DayCell[][] = [];
    for (let index = 0; index < cells.length; index += 7) {
      weeks.push(cells.slice(index, index + 7));
    }
    return weeks;
  });

  /** Formatter for the date appended to each calendar link's accessible name. */
  private readonly linkDateFormat = computed(
    () => new Intl.DateTimeFormat(this.i18n.localeOf(), { dateStyle: 'medium' }),
  );

  /**
   * Accessible name for an event link: visible title + the date it sits on.
   * A screen-reader user hears *where* the event is in time, not just its name.
   */
  eventLinkLabel(item: EventItem): string {
    const title = this.i18n.localized(item.title);
    const date = this.linkDateFormat().format(item.startDate.toDate());
    return `${title} — ${date}`;
  }

  readonly cells = computed<DayCell[]>(() => {
    const anchor = this.month();
    const byDay = new Map<string, EventItem[]>();
    for (const item of this.calendarEvents()) {
      const key = toKey(item.startDate.toDate());
      const bucket = byDay.get(key);
      if (bucket) bucket.push(item);
      else byDay.set(key, [item]);
    }

    const daysInMonth = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0).getDate();
    const cells: DayCell[] = [];
    for (let index = 0; index < anchor.getDay(); index += 1) {
      cells.push({ day: 0, iso: '', events: [] });
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      const key = toKey(new Date(anchor.getFullYear(), anchor.getMonth(), day));
      cells.push({ day, iso: key, events: byDay.get(key) ?? [] });
    }
    while (cells.length % 7 !== 0) {
      cells.push({ day: 0, iso: '', events: [] });
    }
    return cells;
  });

  constructor() {
    this.trigger$
      .pipe(
        switchMap((mode) => this.fetch(mode)),
        takeUntilDestroyed(),
      )
      .subscribe();
  }

  setMode(mode: Mode): void {
    if (this.mode() === mode) return;
    this.mode.set(mode);
    this.trigger$.next(mode);
  }

  previousMonth(): void {
    this.month.update((current) => addMonths(current, -1));
    this.trigger$.next('calendar');
  }

  nextMonth(): void {
    this.month.update((current) => addMonths(current, 1));
    this.trigger$.next('calendar');
  }

  retry(): void {
    this.trigger$.next(this.mode());
  }

  private fetch(mode: Mode): Observable<EventItem[]> {
    this.loading.set(true);
    this.error.set(false);

    const source$: Observable<EventItem[]> =
      mode === 'calendar'
        ? this.eventService.listBetween(
            this.month(),
            new Date(this.month().getFullYear(), this.month().getMonth() + 1, 1),
          )
        : mode === 'past'
          ? this.eventService.listPast()
          : this.eventService.listUpcoming();

    return source$.pipe(
      tap((items) => {
        if (mode === 'calendar') this.calendarEvents.set(items);
        else this.events.set(items);
        this.loading.set(false);
      }),
      map((items) => items),
      // A failed query degrades to an honest error state with retry (§33, §61).
      catchError(() => {
        this.error.set(true);
        this.loading.set(false);
        return of([] as EventItem[]);
      }),
    );
  }
}
