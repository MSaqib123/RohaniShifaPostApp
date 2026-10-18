# Rohani Shifa

A multilingual Islamic content platform: articles, daily reminders, YouTube
videos, events and categories — in **English, Urdu and Arabic**, with full
**RTL** support. Static Angular SPA on GitHub Pages, Firebase Auth + Firestore
behind it, and an admin CMS for publishing.

The repository ships in **demo mode**: with placeholders still in the
environment files it runs, renders and tests — it just has no data and no
backend. Fill in Firebase config and it becomes the live site
([FIREBASE_SETUP.md](./FIREBASE_SETUP.md)).

---

## Features

**Public site**

- Home page assembled from admin-configurable sections (hero, daily reminder,
  featured video, latest posts/videos, upcoming events, categories, CTA).
- Posts with types (`article`, `reminder`, `hadith`, `quran`, `announcement`,
  `event`), categories, tags and related content. Religious sources
  (`source`, `scholar`, `book`, `hadithNumber`, …) are stored exactly as the
  publisher entered them — nothing is ever generated (§47).
- YouTube videos by URL: parsed, validated and embedded — no uploads, no
  Storage (§12).
- Events with upcoming / past / month-calendar views. Past events are
  completed or cancelled, **never auto-deleted** (§17).
- Likes, bookmarks, comments and content reports for signed-in users.
  Guests who try to like are shown the login dialog and the action **replays
  after sign-in** (§19).
- Search across posts, videos, events and categories — honest Firestore prefix
  search, never a ranking the backend cannot deliver (§21).
- About, Privacy, 403 and 404 pages; share buttons; SEO titles/descriptions
  per route.

**Account**

- Email/password sign-up, sign-in, password reset, verification email,
  profile editing (name, photo URL, bio, preferred language).

**Admin CMS** (`/admin`, admin custom claim required)

- Dashboard with exact document counts.
- Posts and videos: list, create, edit, publish/unpublish, archive, delete
  (with confirmation).
- Categories and events: inline editors with status transitions.
- Users: role display, comments: hide/restore/delete, reports: review/dismiss.
- Settings: featured video, curated featured posts, home-section toggles —
  these really change the public home page.

**Languages & layout**

- EN / UR / AR with script-correct typography (`dir` + font swap driven by
  `<html lang>`), and translation keys typed so a key missing from any of the
  three files **fails the build**.
- Content fields are `{ en, ur, ar }` maps with fallback at read time.

---

## Tech stack

| Layer | Choice | Note |
| --- | --- | --- |
| Framework | Angular 22 — standalone components, signals, zoneless, `OnPush` | No NgModules, no `Zone.js` |
| Routing | Lazy `loadComponent` routes, guards as UX only | [SECURITY.md](./SECURITY.md) explains why guards are not security |
| Backend | Firebase JS SDK (Auth email/password + Firestore) | Direct SDK, no AngularFire, no server code of ours |
| UI | Angular CDK only (no Material), custom SCSS design system | Rebrand = edit `src/styles/_tokens.scss` |
| Tests | Vitest via `ng test` | |
| Hosting | GitHub Pages (`angular-cli-ghpages`) | SPA fallback via generated `404.html` |
| YouTube | Embed only | |

---

## Quick start

Prerequisites: Node.js 20+ (Angular 22), npm, git.

```powershell
git clone <your-repo-url> RohaniShifaPostApp
cd RohaniShifaPostApp
npm.cmd install
npm.cmd start          # http://localhost:4200 — demo mode
```

> **Windows/PowerShell note:** `npm` is blocked as a bare command in this
> environment, so use `npm.cmd`. Build/test output should be redirected to a
> file when you need a reliable exit code:
>
> ```powershell
> npm.cmd run build > $env:TEMP\build-out.txt 2>&1; $code=$LASTEXITCODE; Get-Content $env:TEMP\build-out.txt -Tail 20; "EXIT=$code"
> ```

### Commands

| Command | What it does |
| --- | --- |
| `npm.cmd start` | Dev server with hot reload |
| `npm.cmd run build` | Production build → `dist/rohani-shifa` |
| `npm.cmd run watch` | Development build in watch mode |
| `npm.cmd test` | Unit tests (Vitest) |
| `npm.cmd run deploy` | Build for production and publish to the `gh-pages` branch |
| `npm.cmd run seed:sample` | Seed authentic sample categories, posts, YouTube videos & events (§46) |
| `node scripts/check-imports.mjs` | Verifies every relative import resolves |
| `npx firebase-tools deploy --only firestore:rules,firestore:indexes --project <id>` | Publish security rules + indexes |

### Configuration

| File | Purpose |
| --- | --- |
| `src/environments/environment.ts` | Dev config (`authDomain: localhost`) |
| `src/environments/environment.prod.ts` | Production config — **also must be filled in** |
| `src/app/config/site.config.ts` | Branding, tagline, section defaults, nav — no branding is hard-coded elsewhere (§3, §4) |
| `src/styles/_tokens.scss` | All colours/typography — the only file to touch for a rebrand |
| `firestore.rules` / `firestore.indexes.json` | Data access control and query indexes |
| `angular.json` → `deploy` target | `baseHref` for GitHub Pages |

---

## Documentation

| File | Contents |
| --- | --- |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | How the code is layered, why each technology, where to change what |
| [FIREBASE_SETUP.md](./FIREBASE_SETUP.md) | Create the Firebase project, fill config, deploy rules, grant the first admin |
| [SECURITY.md](./SECURITY.md) | Threat model, role matrix, how each rule works, accepted limitations |
| [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) | Every collection, field, index and lifecycle rule |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | GitHub Pages release, base href, 404 fallback, troubleshooting |

---

## Project layout

```text
src/app/
  config/          site.config.ts — branding, nav, home-section defaults
  core/
    auth/          AuthService, session, guards, AuthPromptService (guest → login → replay)
    firebase/      single Firebase init + Firestore ⇄ RxJS helpers
    models/        typed schemas (Post, Video, EventItem, Comment, LikeDoc, …)
    services/      data access: posts, videos, events, categories, search, engagement, admin, toast…
  features/        public pages (home, posts, videos, events, categories, search, auth, profile, errors)
  admin/           admin CMS pages (dashboard, posts, videos, categories, events, users, comments, reports, settings)
  i18n/            I18nService + translations/{en,ur,ar}.ts
  layout/          public/admin shells, header, footer, brand logo
  shared/          reusable components (cards, icon, share bar, engagement bar, comment section…)
src/styles/        design tokens + global layers
src/environments/  Firebase configuration
scripts/           check-imports, set-admin-claim
firestore.rules    the actual security boundary
```

---

## Testing

```powershell
npm.cmd test
```

Seven spec files, 55 tests:

| Spec | Focus |
| --- | --- |
| `src/app/app.spec.ts` | Application shell hosts the icon sprite, toast viewport and router outlet |
| `src/app/core/services/youtube.spec.ts` | YouTube URL parsing/validation and URL builders |
| `src/app/core/auth/auth.guard.spec.ts` | Open-redirect rejection + all three route guards |
| `src/app/core/auth/auth.service.spec.ts` | Demo-mode session contract (no fake login, no fake admin) |
| `src/app/core/services/post.service.spec.ts` | Post queries degrade to empty; writes fail loudly |
| `src/app/i18n/i18n.service.spec.ts` | Language switching: dictionary, `<html lang>`/`dir`, persistence, fallbacks |
| `src/app/core/firebase/firestore.utils.spec.ts` | Search-keyword index (incl. Urdu/Arabic) and Firestore helpers |

Not covered yet: the Firestore-backed code paths against a real project or the
emulator, and `firestore.rules` itself — see [SECURITY.md §9](./SECURITY.md#9-verification--maintenance).

---

## Roadmap / not yet done

- Emulator-backed tests for `firestore.rules` (see [SECURITY.md §9](./SECURITY.md#9-verification--maintenance)).
- Final branding: logo, mission copy and colour palette are still placeholders
  (§66, §70) — they live in `site.config.ts` and `_tokens.scss`.
- Firebase App Check, and optional analytics (off by default, §59).
- No licence file has been chosen for this repository yet.

**Deliberately out of scope:** media uploads/Storage, SSR/prerendering, Cloud
Functions, native apps, ranked/full-text search, comment threading
(`parentCommentId` is reserved for a later release).
