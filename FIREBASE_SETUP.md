# Firebase Setup — Rohani Shifa

Everything in this guide happens **outside** the Angular app: a Firebase
project, two environment files, security rules, and one admin claim. Budget
30–45 minutes the first time.

- Rules, roles and the access matrix → [SECURITY.md](./SECURITY.md)
- What gets stored where → [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)
- Publishing the front end → [DEPLOYMENT.md](./DEPLOYMENT.md)

---

## 0. Demo mode (where the repo starts)

`src/environments/environment*.ts` ships with `REPLACE_WITH_*` placeholders.
`isFirebaseConfigured()` (`src/app/core/firebase/firebase.service.ts`) returns
`false` while `apiKey`, `projectId` or `appId` still start with `REPLACE_WITH`,
and the app runs in **demo mode**:

- every public page renders its honest empty state — no fabricated content (§61);
- auth screens show a configuration notice instead of failing;
- admin routes redirect to `/login` (guard) because there is nothing to talk to.

That is the correct state of a fresh clone. It ends the moment step 2 is done.

---

## 1. Create the Firebase project

1. <https://console.firebase.google.com> → **Add project** (e.g. `rohani-shifa`).
2. Google Analytics: **off** — `analyticsEnabled: false` in both environments
   keeps the bundle privacy-conscious by default (§59). You can enable it later.
3. Continue. No Blaze upgrade is required for this project: no Cloud Functions,
   no Storage, no outbound billing traffic.

---

## 2. Register the web app and fill in the environments

Console → **Project settings → Your apps → Web (`</>`)** → register an app
(nickname `rohani-shifa-web`, **do not** tick "Firebase Hosting"). Copy the
`firebaseConfig` values into **both** files:

| `firebaseConfig` key | Goes to | Notes |
| --- | --- | --- |
| `apiKey` | `environment.ts` **and** `environment.prod.ts` | public by design |
| `projectId` | both | must match the project you just created |
| `appId` | both | |
| `authDomain` | inside `firebase` in both files | Dev keeps `<project>.firebaseapp.com`; production usually the same value. **Also** list `<user>.github.io` under Firebase Auth → Authorized domains (step 3) — that console list is what actually permits sign-in from the Pages origin |
| `storageBucket` | both | unused today (no media uploads, §12) — still copy it |
| `measurementId` | both | only present if Analytics is on; harmless placeholder otherwise |

Files, in order of importance:

```text
src/environments/environment.ts        → development / npm start
src/environments/environment.prod.ts   → production build (fileReplacements)
```

⚠️ **Both files must be filled.** `npm run build` swaps in `environment.prod.ts`;
leaving its placeholders means a *production* site running in demo mode while
local dev works — the most common "why is the live site empty?" mistake.

Also set in `environment.prod.ts`:

- `baseHref` — must equal the `baseHref` of the `deploy` target in
  `angular.json` (default `/RohaniShifaPostApp/`), see DEPLOYMENT.md;
- `authDomain` — `<your-github-username>.github.io`.

Commit these only if your repository is private. The config is not a secret
anyway ([SECURITY.md §7](./SECURITY.md#7-what-is-public-by-design)) — but the
repository being private keeps `measurementId` and bucket noise out of forks.

---

## 3. Enable Authentication (email + password)

Console → **Build → Authentication → Get started → Sign-in method**:

1. Enable **Email/Password** (the only provider this app uses). Leave
   "Email enumeration protection" as Firebase defaults it.
2. **Settings → Authorized domains** must contain:
   - `localhost` (development),
   - `<your-github-username>.github.io` (production — add it *before* first deploy),
   - Firebase's own defaults (`firebaseapp.com`, `web.app`) — leave them.

Password policy: use Firebase's defaults. If you tighten them, users get the
error through `auth.errors.ts` → translated messages.

---

## 4. Create the Firestore database and deploy rules

Console → **Build → Firestore Database → Create database** →
**Production mode** → pick the region closest to your audience
(e.g. `asia-south1`, `europe-west1`, `nam5`). Region cannot be changed later.

> Do **not** create it in *test mode*. Test mode opens the database to the
> internet for 30 days and is the single most common way an Islamic-content
> site ends up with spam.

Then, from the repository (one-time CLI login included):

```powershell
npx firebase-tools login
npx firebase-tools use <your-project-id>
npx firebase-tools deploy --only firestore:rules,firestore:indexes --project <your-project-id>
```

That publishes:

- `firestore.rules` — the real authorisation boundary;
- `firestore.indexes.json` — the composite indexes every public query needs
  (without them Firestore fails queries at runtime with "requires an index").

`firebase.json` already points the CLI at both files. **Re-run this command
after every rules/index change** — it is part of every release.

**Verify now** (Firebase console → Firestore → **Rules → Rules playground**):

| Test | Expect |
| --- | --- |
| Signed out, `GET /posts/{published-id}` | allow |
| Signed out, `GET /posts/{draft-id}` | deny |
| Signed in as normal user, `POST /users/{their-uid}` with `role: "admin"` | deny |
| Signed in as normal user, `GET /likes/{someone-elses-like-id}` | deny |

---

## 5. Grant the first administrator

Authority is the **custom claim** `admin: true`, never the `role` field
(SECURITY.md §2). Claims can only be set from trusted code, so this happens on
your machine — not in the browser.

```powershell
npm.cmd i -D firebase-admin                       # one-time, dev-only
$env:GOOGLE_APPLICATION_CREDENTIALS = "C:\path\to\service-account.json"
node scripts/set-admin-claim.mjs admin@example.com          # grant
node scripts/set-admin-claim.mjs admin@example.com --revoke # revoke
```

Service account: **Project settings → Service accounts → Generate new private
key**. Treat that JSON like a password: keep it **outside** the repository (for
example in your user profile folder) — `.gitignore` does not exclude arbitrary
JSON by default, and committing a service-account key grants full control of
the project.

How the pieces line up afterwards:

1. The user signs up through the app (or console) → `users/{uid}` is created
   with `role: 'user'` — by a rule that permits nothing else.
2. You run the script → Firebase Auth now carries `admin: true`.
3. The user **signs out and back in** (or reloads) → `AuthService` reads the
   claim into `claimAdmin` on auth-state change → `/admin` guard passes and
   every admin write is accepted by rules.
4. The admin can then press the role toggle on `/admin/users` so the *display*
   field `role: 'admin'` mirrors the claim for the user list. That toggle is
   cosmetic: it changes no authority (SECURITY.md §4.6).

Forgetting step 3 is the usual cause of "I'm an admin but `/admin` says 403":
the claim is in the *token*, and tokens are minted at sign-in/refresh.

---

## 6. First content pass (or One-Click Seed)

You can populate the platform with verified sample Islamic content (Categories, Posts, YouTube Videos, Events, and Settings) in one of two ways:

### Option A: One-Click inside the Admin Dashboard (Recommended)
1. Sign in as the admin user.
2. Go to `/admin` (Admin Dashboard).
3. Click the **"Seed demo data"** button in the top right.
4. Confirm the prompt — the dashboard automatically creates categories, multilingual posts, authentic hadith/Quran reflections, YouTube video links, and upcoming/archived events.

### Option B: Command Line (CLI)
From your terminal with admin credentials:
```powershell
npm.cmd run seed:sample
# or: node scripts/seed-sample-data.mjs
```

### Manual Creation (Optional)
If you prefer creating content manually from scratch:
1. `/admin/categories` — create categories (name in English, Urdu, and Arabic).
2. `/admin/posts/new` — create posts, status `published`.
3. `/admin/videos/new` — paste YouTube URLs (embedded player validates them).
4. `/admin/events` — schedule upcoming and historical events.
5. `/` — confirm sections render and `/posts`, `/videos`, `/events`, `/categories`, `/search` load.
6. `/admin/settings` — select featured video/posts and customize home sections.


---

## 7. Recommended hardening (optional, in this order)

| Step | Why |
| --- | --- |
| **Budget alert** (Google Cloud console → Billing → budgets) | Stops a runaway client loop from surprising you |
| **App Check** (reCAPTCHA v3) with the Firebase JS SDK | Binds requests to your real site origin once it has a domain; see SECURITY.md §8.3 |
| Restrict the browser key (Cloud console → APIs & Services → Credentials → HTTP referrers) | Adds an origin layer on top of (not instead of) rules |
| Firestore **budget/usage alarms** | Complements the dashboard counters |
| Backups: enable **managed backups** or a scheduled export if content becomes precious | Events archive is never auto-deleted (§17) — make sure the store itself is recoverable |

---

## 8. Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| Site loads but every list is empty and a demo banner shows | Placeholders still in the **prod** environment file | Fill `environment.prod.ts`, rebuild |
| `/admin` redirects to `/login` after configuring Firebase | Not signed in, or no admin claim | §5 |
| `/admin` redirects to `/403` although you are signed in | Claim granted but token not refreshed | Sign out → sign in again |
| `permission-denied` on `/admin/posts` | Rules not deployed, or deployed from an older branch | Re-run the deploy command in §4 |
| `failed-precondition: The query requires an index` | Missing composite index | Open the link in the error message (console creates it), then add the same entry to `firestore.indexes.json` |
| Sign-in works, no profile appears | Profile self-heal raced or rules rejected the create | Check the browser console; verify rules with the Rules playground |
| `auth/unauthorized-domain` | Pages domain missing from Authorized domains | §3 |
| Email never arrives | Firebase email provider paused for abuse, or landing in spam | Check Authentication → Templates; sign-up never blocks on delivery |

---

## 9. Reset / handover checklist

- Revoke every admin claim you granted: `node scripts/set-admin-claim.mjs <email> --revoke`.
- Rotate the service-account key (console → Service accounts → delete old key).
- Re-deploy rules so the current file is what the database enforces.
- Move the project to a dedicated billing account if it was personal.
