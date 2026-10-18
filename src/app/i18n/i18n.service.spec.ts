import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { I18nService } from './i18n.service';
import { ar } from './translations/ar';
import { en } from './translations/en';
import { ur } from './translations/ur';

const STORAGE_KEY = 'rohani-shifa.lang';

describe('I18nService', () => {
  let i18n: I18nService;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    i18n = TestBed.inject(I18nService);
  });

  afterEach(() => {
    localStorage.removeItem(STORAGE_KEY);
  });

  it('starts in English, LTR, with the document tagged accordingly', () => {
    expect(i18n.language()).toBe('en');
    expect(i18n.dir()).toBe('ltr');
    expect(i18n.t('nav.home')).toBe(en['nav.home']);
    expect(document.documentElement.lang).toBe('en');
    expect(document.documentElement.dir).toBe('ltr');
  });

  it('switches to Urdu: dictionary, direction, <html lang> and persistence', async () => {
    await i18n.setLanguage('ur');

    expect(i18n.language()).toBe('ur');
    expect(i18n.dir()).toBe('rtl');
    expect(i18n.t('nav.home')).toBe(ur['nav.home']);
    expect(document.documentElement.lang).toBe('ur');
    expect(document.documentElement.dir).toBe('rtl');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('ur');
  });

  it('switches to Arabic: dictionary, direction, <html lang> and persistence', async () => {
    await i18n.setLanguage('ar');

    expect(i18n.language()).toBe('ar');
    expect(i18n.dir()).toBe('rtl');
    expect(i18n.t('nav.posts')).toBe(ar['nav.posts']);
    expect(document.documentElement.lang).toBe('ar');
    expect(document.documentElement.dir).toBe('rtl');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('ar');
  });

  it('returns to English and clears the RTL direction', async () => {
    await i18n.setLanguage('ar');
    await i18n.setLanguage('en');

    expect(i18n.language()).toBe('en');
    expect(i18n.dir()).toBe('ltr');
    expect(i18n.t('nav.posts')).toBe(en['nav.posts']);
    expect(document.documentElement.dir).toBe('ltr');
  });

  it('ignores a repeat switch to the active language', async () => {
    await i18n.setLanguage('en');
    expect(i18n.language()).toBe('en');
    expect(i18n.t('nav.home')).toBe(en['nav.home']);
  });

  it('interpolates parameters and echoes unknown keys', () => {
    expect(i18n.t('common.results', { count: 7 })).toBe('7 results');
    expect(i18n.t('no.such.key')).toBe('no.such.key');
  });

  it('maps every supported language to a direction and locale', () => {
    expect(i18n.dirOf('en')).toBe('ltr');
    expect(i18n.dirOf('ur')).toBe('rtl');
    expect(i18n.dirOf('ar')).toBe('rtl');
    expect(i18n.localeOf('en')).toBe('en-US');
    expect(i18n.localeOf('ur')).toBe('ur-PK');
    expect(i18n.localeOf('ar')).toBe('ar');
  });

  describe('localized()', () => {
    it('prefers the active language', () => {
      expect(i18n.localizedIn({ en: 'Peace', ur: 'سلام', ar: 'سلام' }, 'ur')).toBe('سلام');
    });

    it('falls back to English, then to any non-empty value', () => {
      expect(i18n.localizedIn({ en: 'Peace', ar: '' }, 'ur')).toBe('Peace');
      expect(i18n.localizedIn({ en: '', ur: 'Only Urdu' }, 'en')).toBe('Only Urdu');
    });

    it('passes plain strings through and empty values as empty', () => {
      expect(i18n.localized('already a string')).toBe('already a string');
      expect(i18n.localized(null)).toBe('');
      expect(i18n.localized(undefined)).toBe('');
      expect(i18n.localized({ en: '  ', ur: '   ' })).toBe('');
    });
  });
});
