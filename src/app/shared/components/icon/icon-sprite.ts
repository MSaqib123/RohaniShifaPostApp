import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * One hidden SVG sprite for the whole app (§52).
 *
 * Every `<app-icon name="…">` references these symbols with `<use>`, which
 * keeps the bundle tiny (paths are written once) and gives crisp
 * currentColor strokes at any size. Add new icons by appending a symbol.
 */
@Component({
  selector: 'app-icon-sprite',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      style="position: absolute; width: 0; height: 0; overflow: hidden"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <!-- Brand gradient used by the generated logo mark -->
        <linearGradient id="rs-brand" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#107155" />
          <stop offset="1" stop-color="#07392b" />
        </linearGradient>
      </defs>

      <!-- Navigation -->
      <symbol id="i-home" viewBox="0 0 24 24">
        <path
          d="M3 10.8 12 3.5l9 7.3V20a1.5 1.5 0 0 1-1.5 1.5H15V15H9v6.5H4.5A1.5 1.5 0 0 1 3 20Z"
        />
      </symbol>
      <symbol id="i-post" viewBox="0 0 24 24">
        <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" />
        <path d="M14 3v5h5M9 13h6M9 17h4" />
      </symbol>
      <symbol id="i-video" viewBox="0 0 24 24">
        <rect x="2" y="6" width="14" height="12" rx="2" />
        <path d="m22 8-6 4 6 4Z" />
      </symbol>
      <symbol id="i-play" viewBox="0 0 24 24">
        <path d="M8 5.2v13.6L19 12Z" />
      </symbol>
      <symbol id="i-calendar" viewBox="0 0 24 24">
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M8 3v4M16 3v4M3 10h18" />
      </symbol>
      <symbol id="i-grid" viewBox="0 0 24 24">
        <rect x="4" y="4" width="7" height="7" rx="1" />
        <rect x="13" y="4" width="7" height="7" rx="1" />
        <rect x="4" y="13" width="7" height="7" rx="1" />
        <rect x="13" y="13" width="7" height="7" rx="1" />
      </symbol>
      <symbol id="i-dashboard" viewBox="0 0 24 24">
        <rect x="4" y="4" width="7" height="7" rx="1" />
        <rect x="13" y="4" width="7" height="4" rx="1" />
        <rect x="13" y="11" width="7" height="9" rx="1" />
        <rect x="4" y="14" width="7" height="6" rx="1" />
      </symbol>
      <symbol id="i-search" viewBox="0 0 24 24">
        <circle cx="11" cy="11" r="7" />
        <path d="m20.5 20.5-4.6-4.6" />
      </symbol>
      <symbol id="i-menu" viewBox="0 0 24 24">
        <path d="M4 7h16M4 12h16M4 17h16" />
      </symbol>
      <symbol id="i-close" viewBox="0 0 24 24">
        <path d="m6 6 12 12M18 6 6 18" />
      </symbol>

      <!-- Account / access -->
      <symbol id="i-user" viewBox="0 0 24 24">
        <circle cx="12" cy="8" r="4" />
        <path d="M4.5 21c.8-4 3.9-6.5 7.5-6.5s6.7 2.5 7.5 6.5" />
      </symbol>
      <symbol id="i-login" viewBox="0 0 24 24">
        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" />
      </symbol>
      <symbol id="i-logout" viewBox="0 0 24 24">
        <path d="M9 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h4M16 17l5-5-5-5M21 12H9" />
      </symbol>
      <symbol id="i-shield" viewBox="0 0 24 24">
        <path d="m12 3 7.5 3v5.5c0 4.6-3.2 8-7.5 9.5-4.3-1.5-7.5-4.9-7.5-9.5V6Z" />
        <path d="m9 12 2 2 4-4" />
      </symbol>
      <symbol id="i-settings" viewBox="0 0 24 24">
        <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" />
      </symbol>
      <symbol id="i-lock" viewBox="0 0 24 24">
        <rect x="4" y="10" width="16" height="11" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      </symbol>
      <symbol id="i-mail" viewBox="0 0 24 24">
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <path d="m3 7.5 9 6 9-6" />
      </symbol>

      <!-- Engagement -->
      <symbol id="i-heart" viewBox="0 0 24 24">
        <path
          d="M12 20.5S3.5 15.2 3.5 9.3A4.5 4.5 0 0 1 12 6.9a4.5 4.5 0 0 1 8.5 2.4c0 5.9-8.5 11.2-8.5 11.2Z"
        />
      </symbol>
      <symbol id="i-bookmark" viewBox="0 0 24 24">
        <path d="M6.5 3.5h11a1 1 0 0 1 1 1V21L12 17.2 5.5 21V4.5a1 1 0 0 1 1-1Z" />
      </symbol>
      <symbol id="i-share" viewBox="0 0 24 24">
        <circle cx="18" cy="5.5" r="2.5" />
        <circle cx="6" cy="12" r="2.5" />
        <circle cx="18" cy="18.5" r="2.5" />
        <path d="m8.2 13.3 7.6 4M15.8 6.7l-7.6 4" />
      </symbol>
      <symbol id="i-comment" viewBox="0 0 24 24">
        <path d="M21 11.5a8.5 8.5 0 0 1-12.4 7.6L3.5 20.5l1.4-5.1A8.5 8.5 0 1 1 21 11.5Z" />
      </symbol>
      <symbol id="i-flag" viewBox="0 0 24 24">
        <path d="M5 21V4h13l-2.5 4.5L18 13H5" />
      </symbol>

      <!-- Actions -->
      <symbol id="i-external" viewBox="0 0 24 24">
        <path d="M14 4h6v6M20 4 11 13M19 14v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5" />
      </symbol>
      <symbol id="i-copy" viewBox="0 0 24 24">
        <rect x="8" y="8" width="13" height="13" rx="2" />
        <path d="M5 16H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1" />
      </symbol>
      <symbol id="i-check" viewBox="0 0 24 24">
        <path d="m5 12.5 4.5 4.5L19 7.5" />
      </symbol>
      <symbol id="i-check-circle" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="9" />
        <path d="m8.5 12.5 2.5 2.5 4.5-5" />
      </symbol>
      <symbol id="i-plus" viewBox="0 0 24 24">
        <path d="M12 5v14M5 12h14" />
      </symbol>
      <symbol id="i-edit" viewBox="0 0 24 24">
        <path d="M4 20h4L20.5 7.5a2.1 2.1 0 0 0-3-3L5 17Z" />
        <path d="m14.5 6.5 3 3" />
      </symbol>
      <symbol id="i-trash" viewBox="0 0 24 24">
        <path
          d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6.5 7l.8 12a2 2 0 0 0 2 1.9h5.4a2 2 0 0 0 2-1.9l.8-12"
        />
        <path d="M10 11v6M14 11v6" />
      </symbol>
      <symbol id="i-refresh" viewBox="0 0 24 24">
        <path d="M20 12a8 8 0 1 1-2.3-5.7M20 3.5V9h-5.5" />
      </symbol>
      <symbol id="i-eye" viewBox="0 0 24 24">
        <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z" />
        <circle cx="12" cy="12" r="3" />
      </symbol>
      <symbol id="i-eye-off" viewBox="0 0 24 24">
        <path
          d="M4.5 5.6C2.9 7.1 2 12 2 12s3.6 6.5 10 6.5c1.8 0 3.4-.4 4.7-1M9.9 5.7A11 11 0 0 1 12 5.5c6.4 0 10 6.5 10 6.5a17.4 17.4 0 0 1-3.2 3.9M3 3l18 18"
        />
      </symbol>
      <symbol id="i-filter" viewBox="0 0 24 24">
        <path d="M3 5h18l-7 8v5.5l-4 2V13Z" />
      </symbol>

      <!-- Feedback -->
      <symbol id="i-info" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v5M12 8h.01" />
      </symbol>
      <symbol id="i-alert-circle" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v4.5M12 16h.01" />
      </symbol>
      <symbol id="i-alert-triangle" viewBox="0 0 24 24">
        <path
          d="M10.3 4.3 2.6 17.6a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0Z"
        />
        <path d="M12 9.5v4M12 17h.01" />
      </symbol>

      <!-- Directional -->
      <symbol id="i-chevron-down" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6" /></symbol>
      <symbol id="i-chevron-up" viewBox="0 0 24 24"><path d="m6 15 6-6 6 6" /></symbol>
      <symbol id="i-chevron-left" viewBox="0 0 24 24"><path d="m15 6-6 6 6 6" /></symbol>
      <symbol id="i-chevron-right" viewBox="0 0 24 24"><path d="m9 6 6 6-6 6" /></symbol>
      <symbol id="i-arrow-left" viewBox="0 0 24 24"><path d="M20 12H4m6-6-6 6 6 6" /></symbol>
      <symbol id="i-arrow-right" viewBox="0 0 24 24"><path d="M4 12h16m-6-6 6 6-6 6" /></symbol>

      <!-- Content meta -->
      <symbol id="i-clock" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7.5V12l3 2" />
      </symbol>
      <symbol id="i-map-pin" viewBox="0 0 24 24">
        <path d="M12 21s-7-6.1-7-11a7 7 0 1 1 14 0c0 4.9-7 11-7 11Z" />
        <circle cx="12" cy="10" r="2.5" />
      </symbol>
      <symbol id="i-link" viewBox="0 0 24 24">
        <path d="m9.5 14.5 5-5M8 12l-2 2a3.5 3.5 0 0 0 5 5l2-2M16 12l2-2a3.5 3.5 0 0 0-5-5l-2 2" />
      </symbol>
      <symbol id="i-tag" viewBox="0 0 24 24">
        <path
          d="M11 3H4a1 1 0 0 0-1 1v7l9.5 9.5a1.5 1.5 0 0 0 2.1 0l6.9-6.9a1.5 1.5 0 0 0 0-2.1Z"
        />
        <path d="M7.5 7.5h.01" />
      </symbol>
      <symbol id="i-image" viewBox="0 0 24 24">
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <circle cx="8.5" cy="9.5" r="1.5" />
        <path d="m3 17 5-4 4 3 4-4 5 4" />
      </symbol>
      <symbol id="i-book" viewBox="0 0 24 24">
        <path
          d="M12 6.5C10.5 5 8.5 4.5 4 4.5v13c4.5 0 6.5.5 8 2 1.5-1.5 3.5-2 8-2v-13c-4.5 0-6.5.5-8 2Z"
        />
        <path d="M12 6.5v13" />
      </symbol>
      <symbol id="i-globe" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="9" />
        <path
          d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3Z"
        />
      </symbol>
      <symbol id="i-star" viewBox="0 0 24 24">
        <path d="m12 3.6 2.6 5.4 5.9.8-4.3 4.2 1 5.9-5.2-2.8-5.2 2.8 1-5.9-4.3-4.2 5.9-.8Z" />
      </symbol>
      <symbol id="i-trending" viewBox="0 0 24 24">
        <path d="m3 17 6-6 4 4 8-8M21 7h-6M21 7v6" />
      </symbol>

      <!-- Social / brand integrations -->
      <symbol id="i-youtube" viewBox="0 0 24 24">
        <path
          d="M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4a2.5 2.5 0 0 0-1.8 1.8A26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8A26 26 0 0 0 22 12a26 26 0 0 0-.4-4.8Z"
        />
        <path d="M10 9.5v5l4.5-2.5Z" />
      </symbol>
      <symbol id="i-whatsapp" viewBox="0 0 24 24">
        <path d="M3.5 20.5 5 16.4A8.4 8.4 0 1 1 8 19.3Z" />
        <path
          d="M9 9.5c.4 2.7 2.6 4.9 5.3 5.4l1-1.4 1.7.8c-.3 1.3-1.5 2-2.7 1.8-3-.5-5.7-3.2-6.3-6.2-.2-1.1.6-2.3 1.8-2.6l.9 1.6Z"
        />
      </symbol>
      <symbol id="i-facebook" viewBox="0 0 24 24">
        <path
          d="M14 8.5V7c0-.8.6-1.2 1.4-1.2H17V3h-2.3A3.9 3.9 0 0 0 11 6.9v1.6H9v3h2V21h3v-9.5h2.3l.5-3Z"
        />
      </symbol>

      <!-- Islamic visual accents -->
      <symbol id="i-mosque" viewBox="0 0 24 24">
        <path d="M4 21v-6.5a8 8 0 0 1 16 0V21" />
        <path d="M12 6.2V3.8M2 21h20M10 21v-3.7a2 2 0 0 1 4 0V21M4 17h1M19 17h1" />
      </symbol>
      <symbol id="i-moon" viewBox="0 0 24 24">
        <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5Z" />
      </symbol>
      <symbol id="i-sun" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
      </symbol>
      <symbol id="i-sparkle" viewBox="0 0 24 24">
        <path d="M12 3.5 13.8 9l5.7 1.8-5.7 1.8L12 18.5l-1.8-5.9-5.7-1.8L10.2 9Z" />
        <path d="M19 3v3M20.5 4.5h-3" />
      </symbol>
      <symbol id="i-quran-open" viewBox="0 0 24 24">
        <path
          d="M2 5.5C3.5 4.5 6 4 9 4c2.5 0 4 .8 5 1.5 1-.7 2.5-1.5 5-1.5 3 0 5.5.5 7 1.5v13c-1.5-1-4-1.5-7-1.5-2.5 0-4 .8-5 1.5-1-.7-2.5-1.5-5-1.5-3 0-5.5.5-7 1.5Z"
        />
        <path d="M14 5.5v13" />
        <path d="M5 8h4M5 11h4M19 8h-4M19 11h-4" />
      </symbol>
      <symbol id="i-hands-dua" viewBox="0 0 24 24">
        <path d="M18 11V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2v5" />
        <path d="M14 10V4a2 2 0 0 0-2-2 2 2 0 0 0-2 2v8" />
        <path d="M10 10.5V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7.5" />
        <path d="M6 12V9a2 2 0 0 0-2-2 2 2 0 0 0-2 2v6c0 4.5 3.5 8 8 8h1c4 0 7-3 8-7l1-5" />
      </symbol>
      <symbol id="i-graduation-cap" viewBox="0 0 24 24">
        <path d="M22 10v6M2 10l10-5 10 5-10 5Z" />
        <path d="M6 12.5v5c3 3 9 3 12 0v-5" />
      </symbol>
    </svg>
  `,
})
export class IconSprite {}
