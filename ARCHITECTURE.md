# Architecture — Rohani Shifa

Rohani Shifa is a static single-page application (Angular 22, standalone components, zoneless) that publishes Islamic content — posts (articles, reminders, hadith, Quran, announcements), YouTube videos, events and categories — with likes, comments, bookmarks, reports and a full admin CMS. All data lives in Google Cloud Firestore; identity comes from Firebase Authentication (email/password). The UI ships in three languages (English, Urdu, Arabic) with LTR and RTL layouts from one code base. There is no backend server of its own: the browser talks directly to Firebase through the public web SDK, and authorization is enforced exclusively by `firestore.rules`. The build is deployed as static files to GitHub Pages via `angular-cli-ghpages`.

Companion documents: [SECURITY.md](./SECURITY.md) (security model and access matrix), [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) (document shapes), [FIREBASE_SETUP.md](./FIREBASE_SETUP.md) (Firebase project wiring), [DEPLOYMENT.md](./DEPLOYMENT.md) (GitHub Pages release).

## Architecture at a glance

```text
                    ┌──────────────────────────────────────────────┐
 Browser            │  GitHub Pages (static hosting)               │
  ┌──────────────┐  │  ng deploy → /RohaniShifaPostApp/ (gh-pages) │
  │ Angular SPA  │←─┴──────────────────────────────────────────────┘
  │  Public UI   │
  │  Admin CMS   │── HTTPS ──> Firebase Auth      (email/password, custom claims)
  │  i18n EN/UR/AR             Firebase Firestore (posts, videos, events, …)
  └──────────────┘                ▲
        │                         │ every read/write evaluated by
        └── firebase JS SDK ──────┘ firestore.rules (the security boundary)
```

- The app is one `@angular/build:application` browser bundle; there is no server-side rendering, prerendering, Cloud Functions, or Cloud Storage in this project.
- The Firebase web config in `src/environments/` is public by design; it identifies the project and authorizes nothing (`firestore.rules` + SECURITY.md §7).
- Without real Firebase config (placeholders in `environment*.ts`) the app runs in **demo mode**: pages render honest empty states and auth actions show a configuration notice instead of crashing.

## Technology choices and why

| Choice | Evidence in this repo |
| --- | --- |
| Angular 22 standalone components, no NgModules | Every component is `standalone: true` with per-component `imports`; no `AppModule` exists; bootstrap is `bootstrapApplication(App, appConfig)` in `src/main.ts`. |
| Zoneless change detection | `provideZonelessChangeDetection()` in `src/app/app.config.ts`; every page/component additionally declares `ChangeDetectionStrategy.OnPush`. |
| Signals for view state | Pages hold `signal()`/`computed()` state (e.g. `PostListPage.loading/posts/visiblePosts`); `ToastService` is a signal-based queue; `AuthService` exposes `asReadonly()` signals. |
| Firebase JS SDK v13 directly (not AngularFire) | `package.json` depends on `firebase`, not `@angular/fire`. `FirebaseService` is documented as the "single Firebase entry point for the whole application (§39)", and `firestore.utils.ts` states "components never touch the SDK directly — services do". |
| Angular CDK without Material | Only `@angular/cdk` is a dependency; `ConfirmService` and `AuthPromptService` build dialogs from `Overlay` + `ComponentPortal`; there is no `@angular/material` import anywhere. |
| Custom SCSS design system (no component library) | `src/styles/_tokens.scss` defines the brand as CSS custom properties ("edit THIS file only — components inherit every value"); `angular.json` configures `inlineStyleLanguage: scss` and SCSS as the schematic default. |
| vitest + jsdom for unit tests | `vitest` and `jsdom` are devDependencies; `angular.json` test target uses the `@angular/build:unit-test` builder; `youtube.spec.ts` imports `describe/it/expect` from `vitest`. |
| TypeScript translation modules (not Angular i18n) | `src/app/i18n/translations/{en,ur,ar}.ts`; `ur`/`ar` are typed `Record<TranslationKey, string>` where `TranslationKey = keyof typeof en`, so a missing key fails the build (comment in `ur.ts`). Runtime switching is a signal, not a compile-time locale build. |
| YouTube embed-only for video | `core/services/youtube.ts` is a pure URL→ID parser; `VideoService` stores only `youtubeId` + metadata ("media never enters Firebase Storage"); embeds use `youtube-nocookie.com`. |
| GitHub Pages deployment | `angular.json` `deploy` target: `angular-cli-ghpages:deploy`, `baseHref: "/RohaniShifaPostApp/"`, `branch: "gh-pages"`. |

## Directory structure

```text
src/
├── main.ts                       bootstrapApplication(App, appConfig)
├── index.html                    lang/dir defaults, SEO/OG tags, Google Fonts
├── styles.scss                   @use order: tokens → base → utilities → components → patterns → layout
├── styles/                       _tokens _base _utilities _components _patterns _layout (.scss)
├── environments/                 environment.ts (dev), environment.prod.ts (fileReplaced in prod)
└── app/
    ├── app.config.ts             zoneless, router options, HttpClient, AppTitleStrategy
    ├── app.routes.ts             full route map (public + admin groups)
    ├── app.ts/.html/.scss        root shell: icon sprite + toast viewport + router-outlet
    ├── config/site.config.ts     all replaceable branding: name, tagline, languages, homeSections
    ├── core/
    │   ├── firebase/             firebase.service.ts (init + demo-mode detection), firestore.utils.ts
    │   ├── auth/                 auth.service, auth.guard, auth-prompt.service, session.service, auth.errors
    │   ├── models/               user.model, content.model, engagement.model, index.ts
    │   └── services/             post, video, event, category, engagement, admin, search, seo,
    │                             title.strategy, toast, confirm, youtube (+ youtube.spec.ts)
    ├── features/                 public pages: home, posts, videos, events, categories, search,
    │                             auth (login/signup/forgot-password), profile (PROFILE_ROUTES),
    │                             about, privacy, errors (403, 404)
    ├── admin/                    dashboard, posts (+ post-form), videos (+ video-form),
    │                             categories, events, users, comments, reports, settings
    ├── layout/                   public-layout, header/, footer/, admin-layout/, brand-logo
    ├── shared/
    │   ├── components/           category-card, comment-section, confirm/confirm-dialog, content-state,
    │   │                         engagement-bar, event-card, icon/ (icon + icon-sprite), localized-input,
    │   │                         login-prompt-dialog/, post-card, share-bar,
    │   │                         toast-viewport/, video-card, youtube-player
    │   └── pipes/                app-date.pipe.ts
    └── i18n/                     i18n.service.ts, language.types.ts, language-switcher.ts,
                                  translations/{en,ur,ar}.ts
firestore.rules                   the security boundary (per-collection rules + deny-all catch-all)
firestore.indexes.json            16 composite indexes backing the service queries
firebase.json                     points Firestore deploys at rules + indexes (no hosting config)
scripts/                          dev utilities: check-imports.mjs, set-admin-claim.mjs
public/                           favicon.ico, manifest.webmanifest
```

| Folder | Responsibility |
| --- | --- |
| `src/app/core/firebase` | Single Firebase init (`FirebaseService`), `configured` flag gating demo mode, and the Firestore→RxJS adapters (`fromFirestoreQuery`, `fromFirestoreDoc`, `buildSearchKeywords`, `firestoreErrorKey`) used by every service. |
| `src/app/core/auth` | `AuthService` (Firebase Auth + `users/{uid}` profile signals, admin custom-claim refresh), `AuthPromptService` (guest login dialog + pending-action replay), `SessionService` (shared sign-out flow), `auth.guard.ts` (UX-only guards), `auth.errors.ts` (SDK error → translation key). |
| `src/app/core/models` | Firestore document interfaces (`Post`, `Video`, `EventItem`, `Category`, `UserProfile`, `LikeDoc`, `BookmarkDoc`, `Comment`, `ReportDoc`, `SiteSettings`), `*Draft` payload types, `POST_TYPES`, `engagementId()`. |
| `src/app/core/services` | One access layer per collection plus SEO/title/toast/confirm helpers and the pure YouTube parser. Components never import `firebase/*` directly. |
| `src/app/features` | Public pages; each list/detail page subscribes to a service observable and stores results in signals. |
| `src/app/admin` | CMS pages (list + create/edit form per content type, dashboard with count aggregates, users, comment/report moderation, site settings editor). Route-protected by `authGuard` + `adminGuard`. |
| `src/app/shared` | Presentational components (cards, engagement bar, comment section, dialogs, icon sprite) and the `app-date` pipe; no data access. |
| `src/app/layout` | `PublicLayout` (skip link, header, footer) and `AdminLayout` (sidebar, top bar); `brand-logo.ts` generates a monogram until official assets exist. |
| `src/app/i18n` | `I18nService`, language types (`SupportedLanguage`, `LocalizedText`), the switcher component, and the three translation dictionaries. |
| `src/app/config` | `site.config.ts` — every replaceable branding value (name, tagline, social links, language list, home-section order). |
| `src/styles` | Design tokens and global SCSS layers imported by `src/styles.scss`. |
| `src/environments` | Firebase web config placeholders + `baseHref` (canonical URLs) + `analyticsEnabled` (reserved, unread); prod file swapped by `fileReplacements`. |
| repo root | `firestore.rules`, `firestore.indexes.json`, `firebase.json` (Firestore deploy pointers only). |

## Data flow

A public page follows one pattern (e.g. `PostListPage`):

1. The component constructor calls a service method, e.g. `postService.listPublished({ type, categoryId, max })`.
2. The service returns an RxJS `Observable` backed by `onSnapshot` (via `fromFirestoreQuery`/`fromFirestoreDoc` in `firestore.utils.ts`) — a **live** stream, so status changes appear without a reload.
3. The subscription's `next` callback writes into a component signal (`posts.set(...)`); `error` sets an error flag. `OnPush` + zoneless scheduling re-renders only the affected bindings.
4. The template renders one of the three `ContentStateComponent` states (loading / empty / error-with-retry) plus real content — never filler.
5. Filters re-subscribe: `load()` unsubscribes the previous query and starts a new Firestore query (type/category filters are real queries, not in-memory hiding). "Show more" is client-side slicing (`visibleCount`).

Service shape per collection (`PostService`, `VideoService` are isomorphic):

| Method | Role |
| --- | --- |
| `listPublished(options)` | Public live query: `where('status','==','published')` + `orderBy('publishedAt','desc')`, optional type/category/featured filters and `limit`. |
| `get(id)` | Public live single document. |
| `byIds(ids)` | Related-content resolution; Firestore `in` is chunked into batches of 30, results reordered to match the input ids. |
| `listAll(max)` | Admin list (all statuses), `orderBy('updatedAt','desc')`. |
| `create(authorId, draft)` | Sets id, timestamps, zeroed counters and regenerates `searchKeywords`. |
| `update(id, draft)` | `setDoc(..., { merge: true })`, regenerates `searchKeywords`. |
| `remove(id)` | Batch delete of the document plus its `likes`/`bookmarks`/`comments` traces (capped at 400 docs per collection) so no orphans remain. |

`EventService` adds `listUpcoming` / `listPast` / `listBetween` (month calendar) and `markStatus`; past events are archived (completed/cancelled), never auto-deleted. `CategoryService` exposes `listActive` / `bySlug`. `EngagementService` implements likes/bookmarks as deterministic ids `{uid}_{itemType}_{itemId}` with toggles, and maintains `likesCount`/`commentsCount` on the parent document with `runTransaction` (no Cloud Functions). `AdminService` covers users, comment/report moderation, `settings/site`, and `getCountFromServer`-based dashboard counts.

**Demo mode short-circuits.** Every service method begins with `if (!this.firebase.configured) return of([])` (or `of(null)` / `of(false)` / `of(0)`); `isFirebaseConfigured()` in `firebase.service.ts` returns false while any of `apiKey`/`projectId`/`appId` is missing or still a `REPLACE_WITH…` placeholder. `AuthService` skips `onAuthStateChanged` entirely and marks itself ready; `AuthPromptService.require()` shows a "demo mode" toast instead of the login dialog.

**Search.** `SearchService` is documented as "Firestore-honest search (§21)": every write regenerates a `searchKeywords` array of lowercase prefixes (3–12 chars, first 15 words, ≤400 tokens, Unicode-aware so Urdu/Arabic survive) via `buildSearchKeywords`; search queries `array-contains` for the first typed term and AND-filters the remaining terms client-side, over posts, videos, events plus an in-memory category filter.

## State management model

- **Signals** hold all view state: `loading/error/data` on pages, toast queue, dialog open flags, sidebar state. There is no NgRx or other store library; cross-cutting state lives in root-provided services.
- **RxJS** is used only for Firestore live streams (`onSnapshot`-backed observables) and router events; pages subscribe in constructors and unsubscribe on re-query/destroy.
- **AuthService** is the session source of truth: `user` (Firebase user), `profile` (`users/{uid}` snapshot, with self-healing default-profile creation for console-created users), `claimAdmin` (`admin` custom claim read via `getIdTokenResult()`, refreshed by `refreshClaims()`), and `ready`. `isAdmin` is `claim || profile.role === 'admin'` — display only; rules check the claim.
- **SessionService** centralises the sign-out flow shared by header and admin frame: confirm dialog → clear pending action → sign out → toast → navigate home.
- **AuthPromptService** implements the guest-pending-action replay (§19): `require(label, run)` executes immediately when signed in, otherwise stores `{ label, run, returnUrl }` (a closure in memory, 10-minute TTL) and opens the CDK login dialog; after sign-in the login page calls `takePendingAction(returnUrl)`, which replays only on the same return URL. `safeRedirect()` in `auth.guard.ts` accepts only same-origin `?redirect=` paths (no `//`), preventing open redirects.
- **I18nService.language** is a signal; `t()` reads the dictionary signal, so language switches re-render every bound template and re-apply page metadata (`SeoService` watches the language via `effect`).

## Routing and guards

`app.routes.ts` (documented as the §28 route map) declares two top-level groups; the admin group is listed first so `/admin` never falls through to the SPA 404.

| Group | Routes |
| --- | --- |
| Admin (`AdminLayout`, `canActivate: [authGuard, adminGuard]`) | `''` (dashboard), `posts`, `posts/new`, `posts/:id/edit`, `videos`, `videos/new`, `videos/:id/edit`, `categories`, `events`, `users`, `comments`, `reports`, `settings`; `**` redirects to the dashboard. |
| Public (`PublicLayout`) | `''` (home), `posts`, `posts/:id`, `videos`, `videos/:id`, `events`, `events/:id`, `categories`, `categories/:slug`, `search`, `about`, `privacy`. |
| Guests only (`guestGuard`) | `login`, `signup`, `forgot-password`. |
| Signed-in (`authGuard`) | `profile` → `loadChildren` of `PROFILE_ROUTES` (currently one `ProfilePage`). |
| Errors | `403` (ForbiddenPage), `**` (NotFoundPage). |

- Every page is lazy via `loadComponent` (route-level code splitting); the only `loadChildren` is the profile child-routes module.
- Guards (`authGuard`, `adminGuard`, `guestGuard`) are **UX navigation only** — the file header and SECURITY.md state it explicitly: `firestore.rules` is the security boundary. `adminGuard` sends non-admins to `/403`.
- Router features: `withComponentInputBinding()` (route params bind to component `input()`s on detail pages) and `withInMemoryScrolling({ scrollPositionRestoration: 'top', anchorScrolling: 'enabled' })`.
- `data.titleKey` / `data.descKey` feed `AppTitleStrategy` (custom `TitleStrategy`): it resolves the deepest route data, translates the keys, sets `"<title> | Rohani Shifa"` and calls `SeoService.setRoute()` for meta/OG/canonical/JSON-LD updates. Titles therefore follow the active language automatically.

## Internationalisation and RTL

- **UI strings** live in three TypeScript modules: `en.ts` is the source of truth; `TranslationKey = keyof typeof en`; `ur.ts` and `ar.ts` are typed `Record<TranslationKey, string>`, so a missing or renamed key is a compile error, not a raw key on screen. Strings support `{param}` interpolation.
- **I18nService** keeps the active language in a signal (default from `siteConfig.defaultLanguage`, persisted to `localStorage` under `rohani-shifa.lang`). `en` is bundled synchronously (no flash of raw keys); `ur`/`ar` load as lazy chunks through dynamic `import()` and are cached.
- **Direction and fonts.** `setLanguage()` applies `<html lang>` and `<html dir>` (`applyDocumentLanguage`); `dir: 'rtl'` for Urdu and Arabic comes from `siteConfig.languages`. `_tokens.scss` exposes per-script font stacks (`--font-sans` Inter, `--font-urdu` Noto Nastaliq Urdu, `--font-arabic` Amiri), loaded from Google Fonts in `index.html`. `localeOf()` maps to BCP-47 (`en-US`, `ur-PK`, `ar`) for `Intl` date formatting (`AppDatePipe`).
- **Content text** is stored in Firestore as `LocalizedText { en; ur?; ar?; [key]: string }` — extra keys are allowed so a future language needs no schema change. `I18nService.localized()` resolves active language → English → first non-empty value. Admin forms edit each language separately through the `LocalizedInput` component.
- The language switcher (`language-switcher.ts`) uses radio-group semantics and, for signed-in users, best-effort persists the preference into `users/{uid}.language`.
- `SeoService` re-applies meta tags (including `og:locale`) whenever the language changes.

## Styling and design system

```text
src/styles.scss
  @use 'styles/tokens';       ← CSS custom properties: brand colors, fonts, spacing, radii, shadows
  @use 'styles/base';         ← resets, element defaults, focus rings
  @use 'styles/utilities';    ← small utility classes
  @use 'styles/components';   ← buttons, cards, forms, badges …
  @use 'styles/patterns';     ← composed patterns (hero, section headers …)
  @use 'styles/layout';       ← page/shell layout rules
```

- `_tokens.scss` is the single rebranding point: the header comment states final brand colors replace this file only; components consume semantic aliases (`--primary`, `--text`, `--border`, …) that alias the raw scales.
- Components carry small scoped `*.scss` files (budgets in `angular.json`: warn 6 kB, error 12 kB per component style); global layers carry everything shared.
- RTL relies on the `dir` attribute set on `<html>`; the i18n service describes the direction as driving CSS logical properties in styles.
- The icon system is a generated inline SVG sprite (`icon-sprite.ts`) rendered once by the root `App` component and referenced by `IconComponent` by name.

## Security posture

`firestore.rules` is the enforcement boundary: admin authority is the `admin` custom claim (set only from a trusted context), like/bookmark ownership is encoded in the document id, engagement counters may move by ±1 per signed-in write, comments cannot be self-unmoderated, profile edits are field-whitelisted, and a trailing `match /{document=**} { allow read, write: if false; }` denies everything not explicitly allowed. Route guards and service-layer query choices are UX conveniences over an attacker-rewritable bundle. The full access matrix, rule-by-rule rationale, and accepted limitations (client-trusted counters, no rate limiting, no App Check yet, informational-only email verification) are in [SECURITY.md](./SECURITY.md); the field-level document shapes are in [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md). Deploy rules and indexes with:

```bash
npx firebase-tools deploy --only firestore:rules,firestore:indexes --project <your-project>
```

## Testing strategy

| Spec file | Covers |
| --- | --- |
| `src/app/app.spec.ts` | Root shell creation; hosts the icon sprite, toast viewport and `router-outlet` (TestBed, `provideRouter([])`). |
| `src/app/core/services/youtube.spec.ts` | Pure-function coverage of the YouTube parser/URL builders: watch/short/embed/shorts/live/mobile/scheme-less URLs, bare ids, and rejection of non-YouTube hosts. |
| `src/app/core/auth/auth.guard.spec.ts` | `safeRedirect` (same-origin paths only, no open redirects) and all three guards, executed inside an injection context exactly as the router does. |
| `src/app/core/auth/auth.service.spec.ts` | Demo-mode contract: ready guest session, no admin without a claim, sign-in/sign-up/reset rejecting with a configuration error, and no profile write while signed out. |
| `src/app/core/services/post.service.spec.ts` | Demo-mode contract: public reads degrade to empty/`null`, admin list is empty, and every write rejects instead of pretending it succeeded. |
| `src/app/i18n/i18n.service.spec.ts` | Language switching end to end (dictionary swap, `<html lang>`/`dir`, `localStorage` persistence, return to English), parameter interpolation, unknown-key echo, `localized()` fallback order, per-language locale/direction. |
| `src/app/core/firebase/firestore.utils.spec.ts` | `buildSearchKeywords` (lowercasing, 3–12 char prefixes, Unicode so Urdu/Arabic are searchable, empty input, 400-entry cap), `withId`, `firestoreErrorKey`. |

- Runner: `npm test` → `ng test` → the `@angular/build:unit-test` builder, which runs vitest with jsdom (`vitest` and `jsdom` are devDependencies). `tsconfig.spec.json` is referenced from the root tsconfig for spec type-checking.
- Not covered: the Firestore-backed code paths (they need a real project or the emulator — services short-circuit in demo mode, which is what the specs pin down instead), `AuthPromptService` pending-action replay, page components other than the `App` shell, and `firestore.rules` itself (emulator suite not wired).
- `scripts/check-imports.mjs` (run with `node scripts/check-imports.mjs`) is a dev utility that verifies relative imports resolve; it is not part of `npm test`.

## Swap points and extension guide

| Goal | Where to change |
| --- | --- |
| Hosted search provider (e.g. Algolia/Typesense) | `SearchService` only — its doc comment names itself the swap point; keep `SearchResponse`/`SearchResult` identical and callers (`features/search/search.page.ts`, header) are untouched. |
| Replace prefix search internals | `buildSearchKeywords` (`firestore.utils.ts`) and `tokenize` (`search.service.ts`); every write path already regenerates the index, so no reindexing job exists to migrate. |
| Add a UI language | 1) add the code to `SupportedLanguage` in `language.types.ts`; 2) create `i18n/translations/<code>.ts` implementing `Record<TranslationKey, string>` (the compiler will list every missing key); 3) add a `LanguageOption` (with `dir`) to `siteConfig.languages`; 4) add a font stack to `_tokens.scss` + `index.html` if the script needs one; 5) extend the lazy-`import()` chain in `I18nService.loadDictionary` and `localeOf`. |
| Add a content type | model in `core/models/content.model.ts` → service following the `listPublished/get/byIds/listAll/create/update/remove` shape → lazy routes (public list/detail + admin list/form) in `app.routes.ts` → translation keys → card component in `shared/components` → optionally extend `KEYWORD_COLLECTIONS` in `SearchService` and `POST_TYPES`-style enum lists. |
| Add a post type | push the value into `POST_TYPES` in `content.model.ts` and add `posts.type.<value>` to all three dictionaries; the list page renders options from the array, so no template edit is needed. |
| Add a Firestore collection | **Write the rules block first**: the trailing catch-all in `firestore.rules` (`match /{document=**} { allow read, write: if false; }`) makes any new collection private — no client code can read or write it until an explicit `match` block exists. Then add composite queries' indexes to `firestore.indexes.json` (16 existing entries show the pattern), the model/service, and deploy rules+indexes (command above). |
| Rebrand | `site.config.ts` (name, tagline, mission, social links, logo/favicon paths) and `src/styles/_tokens.scss` (colors/fonts); components hard-code neither. |
| Change hosting path | `baseHref` in `environment.prod.ts` **and** the `deploy` target `baseHref` in `angular.json` — the environment comment states they must match. |

## Not in scope / not present in this repository

Verified against the code; none of the following exist or are wired up:

- **SSR / prerendering / hydration** — the build is browser-only (`@angular/build:application` with a `browser` entry, no `server`/`prerender` options, no `@angular/ssr` dependency). `SeoService` documents the client-rendered limitation and points at a future prerender step; [DEPLOYMENT.md](./DEPLOYMENT.md) covers what that would mean for hosting.
- **Cloud Functions** — none; counters are client transactions, deliberately ("no Cloud Functions needed", `EngagementService`; rules comment `§19`).
- **Firebase Storage / media uploads** — no `firebase/storage` import anywhere; video is YouTube embed-only, images are URLs (`coverImage`, `thumbnailUrl`).
- **Firebase App Check** — not configured; listed as a known limitation in SECURITY.md §8.
- **Analytics SDK** — `analyticsEnabled: false` exists in both environment files but no analytics module is imported or read; Google Fonts is the only third-party request in `index.html`.
- **PWA / service worker** — `public/manifest.webmanifest` exists ("PWA-ready foundation"), but there is no `ngsw-config.json` or service-worker registration.
- **Additional auth providers** — email/password only (`AuthService` uses exclusively `*WithEmailAndPassword` flows); phone/Google/Apple are absent.
- **Enforced email verification** — the verification email is sent best-effort; unverified users can still sign in (SECURITY.md §5).
- **Seed / migration scripts** — `scripts/` holds only utilities: `check-imports.mjs` (import resolution) and `set-admin-claim.mjs` (grants/revokes the admin custom claim with the optional `firebase-admin` package); there is no Firestore seed or backfill code.
- **Rules-test emulator suite** — not wired into `npm test` (SECURITY.md §9).
- **Native mobile apps** — one responsive web SPA; no Ionic/Capacitor/React Native code.
- **`firebase.json` hosting config** — the file only points Firestore deploys at rules/indexes; static hosting is handled by `ng deploy` (angular-cli-ghpages) pushing to the `gh-pages` branch.
