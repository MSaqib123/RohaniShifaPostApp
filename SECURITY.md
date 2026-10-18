# Security — Rohani Shifa

> **Rule zero:** the Angular route guards are navigation ergonomics. `firestore.rules` is the security boundary. If a rule and a guard disagree, assume an attacker already has the guard's view and check what Firestore will actually accept.

This document explains what is protected, how, why, and — just as important — what is *not* protected so nobody mistakes this file for a claim it cannot back up.

---

## 1. Trust model

| Layer | Location | What it does | What it does **not** do |
| --- | --- | --- | --- |
| Route guards | `src/app/core/auth/auth.guard.ts` | Redirects guests away from `/admin`, `/profile`, `/login`-only pages | Cannot prevent anyone from reading a document — Firestore does that |
| Service layer | `src/app/core/services/*.ts` | Chooses *which* queries the UI issues (published-only, own-likes-only) | Is attacker-rewritable: the bundle is public |
| **Firestore rules** | `firestore.rules` | Denies every read/write that is not explicitly allowed | Does not validate business logic beyond the constraints listed below |
| Firebase Auth | Firebase | Identity, password storage, custom claims | Cannot tell you whether a *comment* is sensible |
| Custom claim | Set outside the app (Admin SDK / console) | The only source of `admin` power | Cannot be granted by any code shipped in this repository |

Everything in `src/` is downloadable. Nothing in the client is a secret.

---

## 2. Roles

| Role | Identity | Granted by |
| --- | --- | --- |
| Guest | No `request.auth` | — |
| User | Signed-in email/password account | Self sign-up |
| Admin | `request.auth.token.admin == true` **custom claim** | Trusted context only: Firebase console, Admin SDK script, or `firebase auth:set-custom-user-claims` — see [FIREBASE_SETUP.md](./FIREBASE_SETUP.md) |

Two fields could be mistaken for authority; neither is:

- `users/{uid}.role` — a **display mirror** of the claim. Rules ignore it for authorisation, so editing your own profile document can never make you an admin.
- `adminGuard` in the router — reads the cached claim for a friendly `/403` redirect. Deleting it from the bundle grants nothing.

The app refreshes the claim into memory on sign-in and on `AuthService.refreshClaims()`, which the setup guide tells you to run after granting admin.

---

## 3. Access matrix

Legend: ✅ allowed · ⛔ denied · 🔒 only with the admin claim.

| Collection | Guest read | User read | Admin read | Guest/other write | Owner write | Admin write |
| --- | --- | --- | --- | --- | --- | --- |
| `posts` | published only 🔒 for drafts | published only | 🔒 all | ⛔ | ⛔ | 🔒 |
| `videos` | published only 🔒 for drafts | published only | 🔒 all | ⛔ | ⛔ | 🔒 |
| `events` | published / completed / cancelled | same | 🔒 all (incl. drafts) | ⛔ | ⛔ | 🔒 |
| `categories` | active only | active only | 🔒 all | ⛔ | ⛔ | 🔒 |
| `settings` | ✅ (public home-page layout) | ✅ | 🔒 | ⛔ | ⛔ | 🔒 |
| `users` | ⛔ | own profile only | 🔒 all | ⛔ | own profile, presentation fields only | 🔒 |
| `likes` | ⛔ | own docs only | 🔒 all | ⛔ | create / delete own | 🔒 |
| `bookmarks` | ⛔ | own docs only | 🔒 all | ⛔ | create / delete own | 🔒 |
| `comments` | `visible` only | `visible` + own (any status) | 🔒 all | ⛔ | create, delete own | 🔒 |
| `reports` | ⛔ | ⛔ | 🔒 all | ⛔ | create own report | 🔒 |
| anything else | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ |

The trailing catch-all `match /{document=**} { allow read, write: if false; }` means a **new collection added later is private by default** — you must write a rule before the app can use it.

---

## 4. How the important rules work

### 4.1 Admin authority is a claim, not a field
```
function isAdmin() {
  return signedIn() && request.auth.token.admin == true;
}
```
Custom claims are signed into the ID token by Google's servers. No client can mint one.

### 4.2 Like/bookmark ownership is encoded in the document id
```
likes/{uid}_{itemType}_{itemId}
```
The rule requires `id == request.auth.uid + '_' + itemType + '_' + itemId` **and** `userId == request.auth.uid`. Consequences:

- duplicate likes are structurally impossible (no two users can own the same id);
- a forged "like as someone else" cannot be created — the id would not contain the caller's uid;
- un-liking only ever removes your own document.

### 4.3 Counters are the one shared mutable field
`likesCount` and `commentsCount` live on the parent post/video/event and are maintained by client transactions (`EngagementService.adjustCount`) — this project deliberately has no Cloud Functions.

Rules constrain that write to exactly this shape:

```text
affectedKeys ⊆ { likesCount, commentsCount }
each changed counter moves by at most ±1
no counter may go below 0
a counter that did not exist may only appear as 0 or 1
```

Everything else on the document — `status`, `title`, `authorId`, `searchKeywords` — is untouched by the path, so a hostile client cannot smuggle a content edit through a "like".

### 4.4 Comments cannot be self-unmoderated
- Creation: `status` must be `'visible'`, `content` must be a string of 1–1000 chars (`MAX_COMMENT_LENGTH`), `userId` must be the caller.
- Update: **admin only.** A user whose comment was hidden cannot flip it back; they may only delete it.
- Read: hidden/flagged comments remain readable to their author and to admins (so moderation is transparent), and are excluded from the public query by its `status == 'visible'` filter.

### 4.5 Reports are write-once for the reporter
`status` must be `'open'`, the reporter must be the caller, `reason` 1–500 chars. Only admins can read the queue, change `status`, or delete.

### 4.6 Self-registration is structurally non-escalatable
```
allow create: if owns(uid)
  && request.resource.data.uid == uid
  && request.resource.data.role == 'user'
  && request.resource.data.isActive == true
```
There is no rule anywhere in the file that lets a non-admin write `role: 'admin'` — the admin profile update path is `isAdmin() || …`.

### 4.7 Profile edits are field-whitelisted
A user's own `update` may touch only `displayName`, `photoURL`, `bio`, `language`, `updatedAt`. `role`, `isActive`, `email` and `uid` are admin-only.

---

## 5. Authentication behaviour

- **Provider:** email + password only (Firebase-managed password policy; defaults are fine — do not weaken them in the console).
- **Verification email:** sent on sign-up and re-sendable (`AuthService.resendVerificationEmail`). Delivery failure never blocks sign-up.
  - ⚠️ **Not enforced:** unverified users can still sign in. If you want to require verified addresses, enforce it with an Auth-blocking function or Firebase's "email verified" provider setting — it cannot be enforced by these rules.
- **Password reset:** standard Firebase email flow.
- **Guest → login → replay (§19):** `AuthPromptService.require()` opens the login dialog, remembers the pending action, and replays it after sign-in. The pending action is a *closure in memory*, never a URL parameter or a stored privilege, so it cannot be used to carry authority across users.
- **Open redirects:** `safeRedirect()` accepts only same-origin paths starting with `/` and not `//`. `?redirect=https://evil.example` is ignored.
- **No session secrets:** the ID token lives in Firebase's own IndexedDB storage. Signing out revokes it locally; rules re-check every request regardless.

---

## 6. Input and content constraints

| Input | Constraint | Enforced by |
| --- | --- | --- |
| Comment | 1–1000 chars, `status: 'visible'` | rules + `MAX_COMMENT_LENGTH` |
| Report reason | 1–500 chars | rules |
| Like/bookmark | id ↔ uid correspondence, `itemType ∈ post/video/event` | rules |
| Profile | field whitelist | rules |
| Content documents | admin claim only | rules |
| Search keywords | regenerated server-of-truth style at each write from the localised fields | `PostService`/`VideoService`/`EventService` |
| Localised text `{en, ur, ar}` | shape checked by TypeScript at build time | typed models |

Client-side validation in the admin forms exists to give good error messages. It is not a control.

**Religious sources (§47):** `source`, `reference`, `scholar`, `book`, `chapter`, `hadithNumber` are stored verbatim as the publisher entered them. There is no code path that generates or infers a Quran/Hadith citation, and none should ever be added.

---

## 7. What is public by design

Do not treat these as leaks:

- **The Firebase web config** (`apiKey`, `projectId`, …) in `src/environments/`. It identifies the project; it authorises nothing. Firebase's own documentation states the web config is not a secret.
- **Published content** — posts, videos, active categories, events, `settings/site` (section order and featured ids, no user data).
- **YouTube embedding** — video IDs only; no media is uploaded to Firebase (§12), so Storage rules are not part of this project's surface.

And these are *not* public: drafts, unpublished/archived content, inactive categories, profiles other than your own, likes/bookmarks, hidden comments, the report queue, and every counter-mutation path.

---

## 8. Known limitations (accepted, deliberately)

1. **Client-side counters are ±1-trusted.** A signed-in user could, by scripting the SDK, increment `likesCount`/`commentsCount` without a corresponding like (±1 per call, minimum 0). Fixing this properly requires Cloud Functions or a counter-per-writer aggregate, which the project scoped out (§19). Risk: cosmetic inflation, no data access. Monitor with the dashboard's count aggregates if this matters to you.
2. **No rate limiting.** Comments and reports can be spammed by a signed-in account. Mitigations available without new architecture: Firebase App Check (recommended), Auth blocking functions, or disabling accounts via `users/{uid}.isActive` (note: `isActive` is *display* data today — rules do not yet block writes from inactive users; add that rule if you need it).
3. **No App Check yet.** Enable it once the site has a real domain; it stops other origins from spending your quota with your public config.
4. **Client-side timestamp trust.** `createdAt`/`updatedAt` must be timestamps but their values come from the browser. Ordering, not authorisation, depends on them.
5. **Related-content ids are not validated.** `relatedVideoIds` etc. are admin-authored; if an admin links a *draft* into published content, the public `where(documentId(), 'in', …)` query is denied as a whole and the related section falls back to empty. Pick published items in the admin form (see `byIds` in `PostService`).
6. **Email verification is informational only** (see §5).

---

## 9. Verification & maintenance

**Before every deploy:**

```bash
npx firebase-tools deploy --only firestore:rules,firestore:indexes --project <your-project>
```

Rules and indexes live in the repo, so a review of `firestore.rules` is part of reviewing the code. The Firebase console's **Rules Playground** is the fastest way to test a rule against a fake user without touching production data:

- *not signed in* → `GET /posts/{published-id}` must allow, `GET /posts/{draft-id}` must deny;
- *signed in as a normal user* → `POST /users/{your-uid}` with `role: 'admin'` must deny;
- *signed in as admin* → `PATCH /posts/{id}` must allow.

**Tests:** the client-side half of this contract is pinned down by `src/app/core/auth/auth.guard.spec.ts` (open-redirect rejection, guard outcomes run in an injection context), `src/app/core/auth/auth.service.spec.ts` (no admin without a claim, no silent session, no write while signed out), `src/app/core/services/post.service.spec.ts` (reads degrade to empty, writes fail loudly when unconfigured), `src/app/i18n/i18n.service.spec.ts` and `src/app/core/firebase/firestore.utils.spec.ts`. Rules themselves are exercised with the Firestore emulator — the sample test suite lives in the [Firebase security-rules docs](https://firebase.google.com/docs/firestore/security/get-started); adding it to `npm test` is a natural next step once a Firebase project exists (the emulator needs a local Java runtime, which this machine does not have yet — `firebase emulators:exec --only firestore …` reports that clearly).

**Dependency hygiene (audited 2026-10-18):** `npm audit --omit=dev` reports 4 high findings, all rooted in `@grpc/grpc-js`, which `@firebase/firestore` pulls into the npm tree; the full audit (dev tooling included) reports 10, the remainder being `braces` via `micromatch` under `angular-cli-ghpages`. `npm audit fix --force` answers by downgrading to `firebase@9` — do not take that; re-check for a patched `firebase` release instead, and re-run `npm audit --omit=dev` after any `firebase` upgrade (gRPC is a Node transport, but only a rebuild tells you what actually reaches the browser bundle). Treat an advisory in the `firebase` SDK itself as a release blocker.

**If a rule is ever loosened**, update §3 of this file in the same commit. A matrix that no longer matches `firestore.rules` is worse than no matrix.
