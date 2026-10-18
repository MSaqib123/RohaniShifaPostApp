import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { routes } from './app.routes';
import { AppTitleStrategy } from './core/services/title.strategy';
import { TitleStrategy } from '@angular/router';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(
      routes,
      // Return to top on navigation; keep hash-anchor behaviour (§25 UX).
      withInMemoryScrolling({ scrollPositionRestoration: 'top', anchorScrolling: 'enabled' }),
      // Route params bind to component `input()`s (e.g. detail pages).
      withComponentInputBinding(),
    ),
    provideHttpClient(),
    { provide: TitleStrategy, useClass: AppTitleStrategy },
  ],
};
