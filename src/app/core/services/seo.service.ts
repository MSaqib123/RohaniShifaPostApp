import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { EffectRef, effect } from '@angular/core';
import { environment } from '../../../environments/environment';
import { siteConfig } from '../../config/site.config';
import { I18nService, TranslationKey } from '../../i18n/i18n.service';

export interface PageMeta {
  title?: string;
  description?: string;
  /** Open Graph type ”” defaults to `website`. */
  type?: 'website' | 'article' | 'video.other' | 'event';
  /** Absolute or site-relative image URL for social previews. */
  image?: string;
  /** Structured data object; `null` clears any previous JSON-LD block. */
  jsonLd?: Record<string, unknown> | null;
}

const JSON_LD_ID = 'rs-jsonld';
const CANONICAL_ID = 'rs-canonical';

/**
 * Firestore `Timestamp` → ISO-8601 string for schema.org date fields.
 *
 * Structured data must be machine-readable (`2026-10-18T00:00:00.000Z`), not a
 * localized display string, so JSON-LD builders convert with this instead of
 * formatting. Returns `undefined` for absent dates so the key can be omitted.
 */
export function jsonLdDate(value?: { toMillis(): number } | null): string | undefined {
  if (!value) return undefined;
  try {
    return new Date(value.toMillis()).toISOString();
  } catch {
    return undefined;
  }
}

/**
 * Per-page SEO (§31): titles, meta descriptions, Open Graph / Twitter tags,
 * canonical URLs and JSON-LD structured data.
 *
 * Also documents the client-rendered SPA limitation honestly: crawlers that
 * execute JavaScript see this metadata; for full social-preview control a
 * prerender/SSR step (documented in DEPLOYMENT.md) can be added later.
 */
@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly i18n = inject(I18nService);

  /** Site origin + base path used for canonical/OG URLs. */
  readonly origin =
    typeof location !== 'undefined'
      ? location.origin + environment.baseHref.replace(/\/$/, '')
      : environment.baseHref.replace(/\/$/, '');

  private last: PageMeta | null = null;
  private readonly languageWatcher: EffectRef;

  constructor() {
    // Re-apply metadata when the interface language changes (§5).
    this.languageWatcher = effect(() => {
      const language = this.i18n.language();
      if (this.last) this.apply(this.last, language);
    });
  }

  /** Set metadata for the current page (replaces previous values). */
  setPage(meta: PageMeta): void {
    this.last = meta;
    this.apply(meta, this.i18n.language());
  }

  /** Set the document title + description from a translation key. */
  setRoute(title: string, descriptionKey?: TranslationKey): void {
    const description = descriptionKey ? this.i18n.t(descriptionKey) : undefined;
    this.setPage({ title, description });
  }

  /**
   * Resolve an image path to the absolute URL social crawlers require.
   * Returns `null` when there is nothing to advertise, so callers never emit a
   * broken relative `og:image`.
   */
  absoluteUrl(path?: string | null): string | null {
    if (!path) return null;
    if (/^https?:\/\//i.test(path)) return path;
    if (typeof location === 'undefined') return path;
    return `${this.origin}${path.startsWith('/') ? '' : '/'}${path}`;
  }

  /** Clear page-specific metadata (back to site defaults). */
  reset(): void {
    this.last = null;
    this.apply(
      { title: siteConfig.name, description: siteConfig.description },
      this.i18n.language(),
    );
  }

  private apply(meta: PageMeta, language: string): void {
    const title = meta.title
      ? `${meta.title} | ${siteConfig.name}`
      : `${siteConfig.name} | ${this.i18n.localized(siteConfig.tagline)}`;
    const description = meta.description ?? siteConfig.description;
    const url = this.origin + (typeof location !== 'undefined' ? location.pathname : '');
    const image = meta.image || undefined;

    this.title.setTitle(title);
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ property: 'og:title', content: title });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:type', content: meta.type ?? 'website' });
    this.meta.updateTag({ property: 'og:url', content: url });
    this.meta.updateTag({ name: 'twitter:title', content: title });
    this.meta.updateTag({ name: 'twitter:description', content: description });
    this.applyImage(image);
    this.meta.updateTag({
      property: 'og:locale',
      content: language === 'ur' ? 'ur_PK' : language === 'ar' ? 'ar_AR' : 'en_US',
    });
    this.updateCanonical(url);
    this.updateJsonLd(meta.jsonLd ?? null, url);
  }

  /**
   * Publish (or clear) the social preview image.
   *
   * Clearing matters as much as setting: without it, navigating from a post
   * *with* a cover image to one without would leak the previous image to
   * social crawlers. `twitter:card` follows the same rule — a large card with
   * no image is a broken preview.
   */
  private applyImage(image?: string | null): void {
    const card = image ? 'summary_large_image' : 'summary';
    this.meta.updateTag({ name: 'twitter:card', content: card });

    if (image) {
      this.meta.updateTag({ property: 'og:image', content: image });
      this.meta.updateTag({ name: 'twitter:image', content: image });
      return;
    }
    const ogImage = this.meta.getTag('property="og:image"');
    if (ogImage) this.meta.removeTagElement(ogImage);
    const twitterImage = this.meta.getTag('name="twitter:image"');
    if (twitterImage) this.meta.removeTagElement(twitterImage);
  }

  private updateCanonical(url: string): void {
    let link = this.documentElement().querySelector<HTMLLinkElement>(
      `link[rel="canonical"][id="${CANONICAL_ID}"]`,
    );
    if (!link) {
      link = document.createElement('link');
      link.id = CANONICAL_ID;
      link.rel = 'canonical';
      document.head.appendChild(link);
    }
    link.href = url;
  }

  private updateJsonLd(data: Record<string, unknown> | null, url: string): void {
    const existing = document.getElementById(JSON_LD_ID);
    if (!data) {
      existing?.remove();
      return;
    }
    let script = existing as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.id = JSON_LD_ID;
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify({ '@context': 'https://schema.org', ...data, url });
  }

  private documentElement(): Document {
    return document;
  }
}
