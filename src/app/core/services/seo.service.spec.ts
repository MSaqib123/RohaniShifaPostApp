import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { Meta, Title } from '@angular/platform-browser';
import { SeoService, jsonLdDate } from './seo.service';

describe('SeoService', () => {
  let seo: SeoService;
  let meta: Meta;
  let title: Title;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    seo = TestBed.inject(SeoService);
    meta = TestBed.inject(Meta);
    title = TestBed.inject(Title);
  });

  it('suffixes the site name to the page title', () => {
    seo.setPage({ title: 'Hello' });
    expect(title.getTitle()).toContain('Hello');
    expect(title.getTitle()).toContain('Rohani Shifa');
  });

  it('writes the description to the description and OG/Twitter tags', () => {
    seo.setPage({ title: 'Hello', description: 'A short summary.' });
    expect(meta.getTag('name="description"')?.content).toBe('A short summary.');
    expect(meta.getTag('property="og:description"')?.content).toBe('A short summary.');
    expect(meta.getTag('name="twitter:description"')?.content).toBe('A short summary.');
  });

  it('publishes an image and marks the card as large when one is given', () => {
    seo.setPage({ title: 'With image', image: 'https://example.com/cover.jpg' });
    expect(meta.getTag('property="og:image"')?.content).toBe('https://example.com/cover.jpg');
    expect(meta.getTag('name="twitter:image"')?.content).toBe('https://example.com/cover.jpg');
    expect(meta.getTag('name="twitter:card"')?.content).toBe('summary_large_image');
  });

  it('clears the image tags and downgrades the card when none is given', () => {
    seo.setPage({ title: 'First', image: 'https://example.com/cover.jpg' });
    seo.setPage({ title: 'Second' });
    expect(meta.getTag('property="og:image"')).toBeNull();
    expect(meta.getTag('name="twitter:image"')).toBeNull();
    expect(meta.getTag('name="twitter:card"')?.content).toBe('summary');
  });

  it('does not duplicate meta tags across repeated setPage calls', () => {
    seo.setPage({ title: 'One', description: 'First' });
    seo.setPage({ title: 'Two', description: 'Second' });
    const descriptions = Array.from(document.head.querySelectorAll('meta[name="description"]'));
    expect(descriptions).toHaveLength(1);
    expect(meta.getTag('name="description"')?.content).toBe('Second');
  });

  it('publishes JSON-LD when supplied and removes it when cleared', () => {
    seo.setPage({ title: 'Article', jsonLd: { '@type': 'Article', headline: 'Article' } });
    const script = document.getElementById('rs-jsonld') as HTMLScriptElement | null;
    expect(script).not.toBeNull();
    expect(script?.textContent ?? '').toContain('"@type":"Article"');

    seo.setPage({ title: 'Plain' });
    expect(document.getElementById('rs-jsonld')).toBeNull();
  });

  it('reset restores the site defaults', () => {
    seo.setPage({ title: 'Custom', description: 'Custom desc' });
    seo.reset();
    expect(title.getTitle()).toContain('Rohani Shifa');
    expect(meta.getTag('name="description"')?.content).toContain('Rohani Shifa');
  });

  it('resolves relative image paths against the site origin', () => {
    const absolute = seo.absoluteUrl('/assets/cover.png');
    expect(absolute).not.toBeNull();
    expect(absolute).toMatch(/^https?:\/\//);
    expect(seo.absoluteUrl('https://cdn.example.com/x.png')).toBe('https://cdn.example.com/x.png');
    expect(seo.absoluteUrl(null)).toBeNull();
    expect(seo.absoluteUrl('')).toBeNull();
  });
});

describe('jsonLdDate', () => {
  it('converts a Timestamp-like value to an ISO string', () => {
    const value = { toMillis: () => Date.parse('2026-01-02T03:04:05.000Z') };
    expect(jsonLdDate(value)).toBe('2026-01-02T03:04:05.000Z');
  });

  it('returns undefined for missing or invalid input', () => {
    expect(jsonLdDate(null)).toBeUndefined();
    expect(jsonLdDate(undefined)).toBeUndefined();
  });
});
