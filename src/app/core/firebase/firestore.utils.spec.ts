import { describe, expect, it } from 'vitest';
import { buildSearchKeywords, firestoreErrorKey, withId } from './firestore.utils';

describe('buildSearchKeywords', () => {
  it('lowercases, strips punctuation and indexes every prefix from 3 chars', () => {
    const keywords = buildSearchKeywords('Ramadan, Mubarak!');

    expect(keywords).toContain('ramadan');
    expect(keywords).toContain('ram');
    expect(keywords).toContain('rama');
    expect(keywords).toContain('mub');
    expect(keywords).toContain('mubarak');
    expect(keywords).not.toContain('ramadan,');
  });

  it('keeps short words whole instead of exploding them', () => {
    expect(buildSearchKeywords('Eid')).toEqual(['eid']);
    expect(buildSearchKeywords('Eid')).not.toContain('ei');
  });

  it('indexes Urdu and Arabic (Unicode-aware, no ASCII-only assumption)', () => {
    const keywords = buildSearchKeywords('رمضان كريم');

    expect(keywords).toContain('رمضان');
    expect(keywords).toContain('رمض');
    expect(keywords).toContain('كريم');
  });

  it('combines several fields and de-duplicates repeated words', () => {
    const keywords = buildSearchKeywords('Daily reminder', 'daily reminder', 'peace');

    expect(keywords.filter((k) => k === 'daily')).toHaveLength(1);
    expect(keywords).toContain('peace');
  });

  it('returns an empty index for empty input', () => {
    expect(buildSearchKeywords('', null, undefined)).toEqual([]);
    expect(buildSearchKeywords('   ', '  ')).toEqual([]);
  });

  it('stays within the documented 400-entry cap', () => {
    const words = Array.from({ length: 80 }, (_, i) => `word${i}abcdefghij`);
    expect(buildSearchKeywords(words.join(' ')).length).toBeLessThanOrEqual(400);
  });
});

describe('withId', () => {
  it('merges the document id into its data', () => {
    expect(withId({ id: 'abc', data: () => ({ title: 'T' }) } as never)).toEqual({
      id: 'abc',
      title: 'T',
    });
  });
});

describe('firestoreErrorKey', () => {
  it('maps known Firestore codes to translation keys', () => {
    expect(firestoreErrorKey({ code: 'permission-denied' })).toBe('error.forbiddenMessage');
    expect(firestoreErrorKey({ code: 'not-found' })).toBe('error.notFoundMessage');
    expect(firestoreErrorKey({ code: 'unavailable' })).toBe('error.loadFailedMessage');
  });

  it('falls back for unknown or missing codes', () => {
    expect(firestoreErrorKey({ code: 'weird' })).toBe('common.errorMessage');
    expect(firestoreErrorKey(undefined)).toBe('common.errorMessage');
  });
});
