import { Pipe, PipeTransform, inject } from '@angular/core';
import { I18nService } from '../../i18n/i18n.service';

/** Accepts anything date-like the app handles: Timestamp, Date or ISO string. */
export type DateLike = Date | string | number | { toDate(): Date } | null | undefined;

/**
 * Locale-aware date formatting (§5).
 *
 * Always uses the *active* language's BCP-47 locale, so switching language
 * re-renders every date on the page — one pipe, three locales.
 *
 * ```html
 * {{ event.startDate | appDate:'medium' }}
 * ```
 */
@Pipe({ name: 'appDate', standalone: true, pure: false })
export class AppDatePipe implements PipeTransform {
  private readonly i18n = inject(I18nService);

  // Formatters are expensive to build and the inputs that define them are a
  // tiny bounded set (3 locales × 3 date styles × 2 time styles), so cache
  // them for the lifetime of the app instead of per call.
  private static readonly formatters = new Map<string, Intl.DateTimeFormat>();

  transform(
    value: DateLike,
    dateStyle: 'short' | 'medium' | 'long' = 'medium',
    timeStyle?: 'short' | 'medium',
  ): string {
    const date = this.toDate(value);
    if (!date) return '';
    return this.formatter(dateStyle, timeStyle).format(date);
  }

  private formatter(
    dateStyle: 'short' | 'medium' | 'long',
    timeStyle: 'short' | 'medium' | undefined,
  ): Intl.DateTimeFormat {
    const locale = this.i18n.localeOf();
    const key = `${locale}|${dateStyle}|${timeStyle ?? ''}`;
    let fmt = AppDatePipe.formatters.get(key);
    if (!fmt) {
      fmt = new Intl.DateTimeFormat(locale, {
        dateStyle,
        ...(timeStyle ? { timeStyle } : {}),
      });
      AppDatePipe.formatters.set(key, fmt);
    }
    return fmt;
  }

  private toDate(value: DateLike): Date | null {
    if (!value) return null;
    if (typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
      return value.toDate();
    }
    if (value instanceof Date) return value;
    const date = new Date(value as string | number);
    return Number.isNaN(date.getTime()) ? null : date;
  }
}
