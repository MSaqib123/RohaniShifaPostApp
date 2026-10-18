import { Injectable, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRouteSnapshot, RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { siteConfig } from '../../config/site.config';
import { I18nService, TranslationKey } from '../../i18n/i18n.service';
import { SeoService } from '../services/seo.service';

/**
 * Route-driven page titles + meta descriptions (§31).
 *
 * Routes declare translatable metadata:
 * ```ts
 * { path: 'posts', data: { titleKey: 'nav.posts', descKey: 'posts.subtitle' } }
 * ```
 * Titles therefore follow the active language automatically.
 */
@Injectable({ providedIn: 'root' })
export class AppTitleStrategy extends TitleStrategy {
  private readonly seo = inject(SeoService);
  private readonly i18n = inject(I18nService);
  private readonly browserTitle = inject(Title);

  /** Required by `TitleStrategy`: apply the built title to the document. */
  override updateTitle(routerState: RouterStateSnapshot): void {
    const title = this.buildTitle(routerState);
    if (title !== undefined) this.browserTitle.setTitle(title);
  }

  override buildTitle(routerState: Parameters<TitleStrategy['buildTitle']>[0]): string | undefined {
    const data = this.deepestData(routerState.root);
    if (!data) return undefined;

    const titleKey = data['titleKey'] as TranslationKey | undefined;
    const plainTitle = data['title'] as string | undefined;
    const descKey = data['descKey'] as TranslationKey | undefined;

    const title = titleKey ? this.i18n.t(titleKey) : plainTitle;
    if (typeof title !== 'string' || title.length === 0) return undefined;

    this.seo.setRoute(title, descKey);
    return `${title} | ${siteConfig.name}`;
  }

  /** Deepest activated route data along the primary outlet chain. */
  private deepestData(snapshot: ActivatedRouteSnapshot): Record<string, unknown> | null {
    let current: ActivatedRouteSnapshot | null = snapshot;
    let deepest: Record<string, unknown> | null = null;
    while (current) {
      if (current.data && Object.keys(current.data).length > 0) {
        deepest = current.data as Record<string, unknown>;
      }
      current = current.firstChild ?? null;
    }
    return deepest;
  }
}
