import { DOCUMENT } from '@angular/common';
import { Injectable, computed, inject, signal } from '@angular/core';
import { siteConfig } from '../config/site.config';
import {
  LocalizedText,
  SupportedLanguage,
  TextDirection,
  TranslationParams,
} from './language.types';
import { en } from './translations/en';

export type TranslationKey = keyof typeof en;

const STORAGE_KEY = 'rohani-shifa.lang';

/** Dictionaries are cached across the session; `en` is bundled synchronously
 *  (no flash of raw keys), other languages load as lazy chunks. */
const cache = new Map<SupportedLanguage, Record<string, string>>([['en', en]]);

function isSupportedLanguage(value: unknown): value is SupportedLanguage {
  return siteConfig.languages.some((l) => l.code === value);
}

function readStoredLanguage(): SupportedLanguage | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isSupportedLanguage(stored) ? stored : null;
  } catch {
    return null;
  }
}

async function loadDictionary(lang: SupportedLanguage): Promise<Record<string, string>> {
  const hit = cache.get(lang);
  if (hit) return hit;
  const mod: Record<string, Record<string, string>> = lang === 'ur'
    ? await import('./translations/ur')
    : lang === 'ar'
      ? await import('./translations/ar')
      : await import('./translations/en');
  const dict = mod[lang];
  cache.set(lang, dict);
  return dict;
}

function interpolate(template: string, params?: TranslationParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match,
  );
}

/**
 * Application-wide i18n (§5).
 *
 * - `t(key)`      → UI label for the active language (signal-tracked in templates)
 * - `localized(x)`→ Firestore multilingual field for the active language
 * - switching language updates: dictionary, `<html lang>`, `<html dir>`
 *
 * One application, three languages — never three copies of a page.
 */
@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly doc = inject(DOCUMENT);

  /** Active UI language (persisted per browser). */
  readonly language = signal<SupportedLanguage>(readStoredLanguage() ?? siteConfig.defaultLanguage);

  /** Active text direction — drives CSS logical properties everywhere. */
  readonly dir = computed<TextDirection>(() => this.dirOf(this.language()));

  /** Loaded dictionary; signal reads inside `t()` re-render bound views. */
  private readonly dict = signal<Record<string, string>>(en);

  /** Available languages come from siteConfig (§3 — replaceable branding). */
  readonly languages = siteConfig.languages;

  readonly currentLanguageOption = computed(
    () => this.languages.find((l) => l.code === this.language()) ?? this.languages[0],
  );

  constructor() {
    this.applyDocumentLanguage(this.language());
    if (this.language() !== 'en' || !cache.has(this.language())) {
      void this.loadIntoView(this.language());
    }
  }

  /** Switch the active language; resolves once the dictionary is available. */
  async setLanguage(lang: SupportedLanguage): Promise<void> {
    if (!isSupportedLanguage(lang) || lang === this.language()) return;
    this.language.set(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      /* storage may be unavailable — language simply won't persist */
    }
    this.applyDocumentLanguage(lang);
    await this.loadIntoView(lang);
  }

  /** Translate a UI key. Unknown keys render as-is (visible during development). */
  t(key: TranslationKey | (string & {}), params?: TranslationParams): string {
    const text = this.dict()[key] ?? en[key as TranslationKey] ?? key;
    return interpolate(text, params);
  }

  /**
   * Resolve a multilingual content field for the active language with
   * graceful fallback: active → English → first non-empty value.
   */
  localized(value: LocalizedText | string | null | undefined): string {
    return this.localizedIn(value, this.language());
  }

  /** Same as `localized()` but for an explicit language (previews, tests). */
  localizedIn(value: LocalizedText | string | null | undefined, lang: SupportedLanguage): string {
    if (value == null) return '';
    if (typeof value === 'string') return value;
    const primary = value[lang]?.trim();
    if (primary) return primary;
    if (value.en?.trim()) return value.en;
    for (const key of Object.keys(value)) {
      const candidate = value[key]?.trim();
      if (candidate) return candidate;
    }
    return '';
  }

  dirOf(lang: SupportedLanguage): TextDirection {
    return this.languages.find((l) => l.code === lang)?.dir ?? 'ltr';
  }

  /** BCP-47 locale used for Intl date/number formatting per language. */
  localeOf(lang: SupportedLanguage = this.language()): string {
    switch (lang) {
      case 'ur':
        return 'ur-PK';
      case 'ar':
        return 'ar';
      default:
        return 'en-US';
    }
  }

  private async loadIntoView(lang: SupportedLanguage): Promise<void> {
    const dict = await loadDictionary(lang);
    // Guard against a race where the user switches language twice quickly.
    if (this.language() === lang) {
      this.dict.set(dict);
    }
  }

  private applyDocumentLanguage(lang: SupportedLanguage): void {
    const el = this.doc.documentElement;
    el.lang = lang;
    el.dir = this.dirOf(lang);
  }
}
