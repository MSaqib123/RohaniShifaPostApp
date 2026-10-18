/**
 * Multilingual types (§5).
 *
 * `SupportedLanguage` is the single place to add a new UI language; after
 * adding a code here, create `translations/<code>.ts` implementing
 * `Record<TranslationKey, string>` — the compiler enforces completeness.
 * Document languages (`dir`) are applied to <html> by I18nService.
 */
export type SupportedLanguage = 'en' | 'ur' | 'ar';

export type TextDirection = 'ltr' | 'rtl';

/**
 * Multilingual content stored in Firestore (§5, §11).
 * Extra keys are allowed so future languages never require a schema change.
 */
export interface LocalizedText {
  en: string;
  ur?: string;
  ar?: string;
  [key: string]: string | undefined;
}

/** Placeholders interpolated into translation strings: `t('key', { count: 3 })`. */
export type TranslationParams = Record<string, string | number>;

/** Firestore `Timestamp`-like value (structural typing keeps models testable). */
export interface TimestampLike {
  toDate(): Date;
  toMillis(): number;
}
