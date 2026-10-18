# Database Schema — Rohani Shifa

Single Firestore database, ten collections, no server code. This file is the
authoritative description of **what is stored**; [SECURITY.md](./SECURITY.md)
is the authoritative description of **who may touch it**. Types below use
Firestore types (`string`, `int`, `bool`, `timestamp`, `array<…>`, `map<…>`).

Source of truth for every shape is `src/app/core/models/*.ts`. If this document
and the models disagree, the models are right — update this file.

---

## 1. Conventions

| Convention | Rule |
| --- | --- |
| Document id | Firestore-generated (`doc(collection(db, …))`) except `users/{uid}` and `settings/site` (see below) |
| Multilingual field | `map { en: string, ur: string, ar: string }` — written as `LocalizedText`; readers apply fallback (`en` → any available) |
| Timestamps | `timestamp`, written with `Timestamp.now()` by the client |
| Counters | `int`, never negative; maintained by client transactions |
| Status field | string enum, listed per collection |
| Trailing fields | `createdAt` / `updatedAt` exist on every mutable collection |

### 1.1 Localized text

```json
{ "en": "Ramadan reminders", "ur": "رمضان کی یاد دہانیاں", "ar": "تذكيرات رمضان" }
```

Empty languages are allowed — the UI falls back rather than showing a blank.
Language packs are *not* schema-versioned: adding a language means adding a key
to `src/app/i18n/translations/*` and a field to `LocalizedText`, not a
migration.

### 1.2 `searchKeywords` — how search is stored

Every content write regenerates this array via `buildSearchKeywords()`
(`src/app/core/firebase/firestore.utils.ts`):

- lowercased, punctuation stripped (Unicode-aware, so Urdu/Arabic survive);
- first 15 distinct words;
- for words longer than 3 characters, **every prefix of length 3…12** plus the
  whole word (`ramadan` → `ram`, `rama`, `ramad`, …, `ramadan`);
- capped at 400 entries per document.

Search then does `where('searchKeywords', 'array-contains', firstPrefix)` plus a
client-side AND over the remaining prefixes (`SearchService`). It is honest
prefix search: it never claims ranked/full-text results it does not have (§21).

### 1.3 Fields the client must never hand-write

| Field | Owner of the value |
| --- | --- |
| `authorId`, `createdBy`, `reporterId`, `userId`, `uid` | Auth session |
| `createdAt`, `updatedAt` | `Timestamp.now()` at the write site |
| `searchKeywords` | `buildSearchKeywords()` inside the service |
| `likesCount`, `commentsCount` | `EngagementService.adjustCount()` transactions only |
| `role` on `users` | Display mirror of the admin **custom claim**; written only by admin flows |

`PostDraft`/`VideoDraft`/`EventDraft`/`CategoryDraft` are TypeScript types that
structurally exclude the server-owned fields, so a normal admin form cannot
accidentally send them.

---

## 2. `posts/{postId}`

Publication lifecycle (`ContentStatus`): `draft → published → unpublished → archived`.
Only `published` is publicly readable (rules).

| Field | Type | Req | Notes |
| --- | --- | --- | --- |
| `type` | `string` enum | ✔ | `article` \| `reminder` \| `hadith` \| `quran` \| `announcement` \| `event` (editable list: `POST_TYPES`) |
| `title`, `description`, `content` | localized map | ✔ / ✔ / ✔ | `content` is the body text |
| `categoryIds` | `array<string>` | ✔ | may be empty |
| `status` | `string` enum | ✔ | see lifecycle above |
| `publishedAt` | `timestamp \| null` | ✔ | what public queries order by; `null` for drafts |
| `featured` | `bool` | ✔ | admin curation flag |
| `coverImage` | `string` (URL) | ✖ | optional |
| `slug` | `string` | ✖ | optional; public routes use ids |
| `tags` | `array<string>` | ✔ | indexed into `searchKeywords` |
| `relatedVideoIds` | `array<string>` | ✔ | **must reference published videos** (see note) |
| `relatedEventIds` | `array<string>` | ✔ | |
| `source`, `reference`, `scholar`, `book`, `chapter`, `hadithNumber` | `string` | ✖ | religious citations stored **verbatim as entered** (§47) — never generated |
| `searchKeywords` | `array<string>` | ✔ | §1.2 |
| `likesCount` | `int` | ✔ | starts `0` |
| `commentsCount` | `int` | ✔ | starts `0` |
| `authorId` | `string` | ✔ | admin uid |
| `createdAt`, `updatedAt` | `timestamp` | ✔ | |

> **Related-content note.** Public resolution of related ids uses a single
> `where(documentId(), 'in', …)` query. Rules deny the whole query if any
> referenced document is a draft, so the admin form must only link published
> items. The public section then degrades to "nothing related" rather than
> leaking a draft.

**Indexes:** `status+publishedAt`, `status+type+publishedAt`,
`categoryIds(CONTAINS)+status+publishedAt`,
`categoryIds(CONTAINS)+status+type+publishedAt`,
`searchKeywords(CONTAINS)+status+publishedAt`.

---

## 3. `videos/{videoId}`

Same lifecycle as posts. YouTube only — `youtubeId` is the **only** media
reference; nothing is uploaded to Firebase Storage (§12).

| Field | Type | Req | Notes |
| --- | --- | --- | --- |
| `youtubeId` | `string` | ✔ | 11-char id, validated by `parseYouTubeId()` |
| `youtubeUrl` | `string` | ✔ | original URL as pasted by the admin |
| `title`, `description` | localized map | ✔ / ✔ | |
| `categoryIds` | `array<string>` | ✔ | |
| `status` | `string` enum | ✔ | `draft` \| `published` \| `unpublished` \| `archived` |
| `publishedAt` | `timestamp \| null` | ✔ | |
| `featured` | `bool` | ✔ | |
| `thumbnailUrl` | `string` | ✖ | defaults to the YouTube thumbnail at read time |
| `relatedPostIds`, `relatedEventIds`, `tags` | `array<string>` | ✔ | |
| `searchKeywords`, `likesCount`, `commentsCount`, `authorId`, `createdAt`, `updatedAt` | — | ✔ | as posts |

**Indexes:** `status+publishedAt`, `categoryIds(CONTAINS)+status+publishedAt`,
`searchKeywords(CONTAINS)+status+publishedAt`.

---

## 4. `events/{eventId}`

Statuses (`EventStatus`): `draft`, `published`, `cancelled`, `completed`.
**History rule:** an event that already happened is *completed* or *cancelled*,
never auto-deleted (§17). Past events remain publicly readable — that is why
`listPast()` can filter on `status in ['published','completed','cancelled']`.

| Field | Type | Req | Notes |
| --- | --- | --- | --- |
| `title`, `description` | localized map | ✔ / ✔ | |
| `startDate` | `timestamp` | ✔ | sorts every public event query |
| `endDate` | `timestamp \| null` | ✖ | |
| `location` | `string` | ✖ | free text, also indexed for search |
| `isOnline` | `bool` | ✔ | |
| `meetingUrl` | `string` | ✖ | shown only for online events |
| `categoryId` | `string \| null` | ✖ | single category (unlike posts/videos) |
| `relatedPostIds`, `relatedVideoIds` | `array<string>` | ✔ | |
| `status` | `string` enum | ✔ | |
| `searchKeywords` | `array<string>` | ✔ | title + description + location |
| `likesCount` | `int` | ✖ | **absent until the first like** — rules allow it to appear as `0`/`1` |
| `createdAt`, `updatedAt`, `createdBy` | — | ✔ | |

Events deliberately have **no** `commentsCount` field: the event detail page
does not offer comments (`showComments = false`).

**Indexes:** `status+startDate` (asc and desc variants),
`searchKeywords(CONTAINS)+status+startDate`.

---

## 5. `categories/{categoryId}`

Dynamic, admin-created, shared by posts and videos (§15). Nothing about
categories is hard-coded in the UI or bundled in the build.

| Field | Type | Req | Notes |
| --- | --- | --- | --- |
| `name` | localized map | ✔ | |
| `slug` | `string` | ✔ | unique by convention; public route key `/categories/:slug` |
| `description` | localized map | ✖ | |
| `icon` | `string` | ✖ | name resolved by `AppIcon`, never an inline image path |
| `imageUrl` | `string` | ✖ | |
| `isActive` | `bool` | ✔ | `false` hides it from every public query |
| `sortOrder` | `int` | ✔ | public order; ties broken by index order |
| `createdAt`, `updatedAt` | `timestamp` | ✔ | |

**Indexes:** `isActive+sortOrder`.

---

## 6. `settings/site`

A single document (fixed id `site`) driving the public home page (§22).
Writable by admins only, readable by everyone. Absent document ⇒ app falls back
to `siteConfig.homeSections` in `src/app/config/site.config.ts`.

| Field | Type | Req | Notes |
| --- | --- | --- | --- |
| `featuredVideoId` | `string \| null` | ✖ | must reference a published video |
| `featuredPostIds` | `array<string>` | ✖ | curated selection, order preserved, max 6 rendered |
| `homeSections` | `array<map { id: string, enabled: bool }>` | ✖ | ids match `siteConfig.homeSections`: `hero`, `dailyReminder`, `featuredVideo`, `latestPosts`, `latestVideos`, `upcomingEvents`, `categories`, `cta` |
| `updatedAt` | `timestamp` | ✖ | |

Stored with `setDoc(…, { merge: true })`, so editing one field never clears
another.

---

## 7. `users/{uid}`

One profile per authenticated user; **document id = Firebase Auth uid** (the
only predictable id in the schema, which is what makes the owner rules a one-liner).

| Field | Type | Req | Notes |
| --- | --- | --- | --- |
| `uid` | `string` | ✔ | must equal the document id |
| `email` | `string` | ✔ | |
| `displayName` | `string` | ✔ | falls back to email |
| `photoURL` | `string` | ✖ | |
| `role` | `user` \| `admin` | ✔ | **display only** — authority is the custom claim |
| `isActive` | `bool` | ✔ | created `true`; display flag today (see SECURITY.md §8) |
| `bio` | `string` | ✖ | |
| `language` | `en` \| `ur` \| `ar` | ✖ | preferred language |
| `createdAt`, `updatedAt` | `timestamp` | ✔ | |

Created lazily: `AuthService` self-heals on first sign-in for accounts created
outside the app, always with `role: 'user'`.

**Indexes:** none beyond the automatic `createdAt` single-field index
(admin list order).

---

## 8. `likes/{uid}_{itemType}_{itemId}`

The document id **is** the ownership proof (§19).

| Field | Type | Req | Notes |
| --- | --- | --- | --- |
| `id` | `string` | ✔ | equals the document id |
| `userId` | `string` | ✔ | must equal `request.auth.uid` |
| `itemType` | `post` \| `video` \| `event` | ✔ | |
| `itemId` | `string` | ✔ | target document id |
| `createdAt` | `timestamp` | ✔ | |

No counter field lives here — `likesCount` lives on the target (§1.3).
Toggling = `setDoc` (create) or `deleteDoc`; a duplicate like is impossible
because two users cannot share a document id.

**Indexes:** `userId+itemType` (powers "my likes" for a profile).

---

## 9. `bookmarks/{uid}_{itemType}_{itemId}`

Identical shape and id convention to `likes`. No counter, no denormalisation —
bookmarks are a private per-user set.

**Indexes:** `userId+itemType`.

---

## 10. `comments/{commentId}`

Attachable to posts and videos (not events). Moderation state lives on the
document (§48); the public query only ever asks for `visible`.

| Field | Type | Req | Notes |
| --- | --- | --- | --- |
| `itemType` | `post` \| `video` | ✔ | |
| `itemId` | `string` | ✔ | target document |
| `userId` | `string` | ✔ | author uid |
| `displayName` | `string` | ✔ | denormalised so rendering needs no join |
| `content` | `string` | ✔ | 1–1000 chars (`MAX_COMMENT_LENGTH`), enforced in UI **and** rules |
| `parentCommentId` | `string \| null` | ✖ | reserved for threading; always `null` today |
| `status` | `visible` \| `hidden` \| `flagged` | ✔ | created `visible`; only admins change it |
| `createdAt`, `updatedAt` | `timestamp` | ✔ | |

The author's `commentsCount` on the target document is incremented/decremented
in the same flow (`addComment` / `removeComment`), constrained by rules to ±1.

**Indexes:** `itemType+itemId+status+createdAt` (public thread),
`userId+createdAt` (profile "my comments").

---

## 11. `reports/{reportId}`

User-submitted moderation reports (§48). Admin-only queue.

| Field | Type | Req | Notes |
| --- | --- | --- | --- |
| `reporterId` | `string` | ✔ | must equal `request.auth.uid` |
| `targetType` | `post` \| `video` \| `event` \| `comment` | ✔ | |
| `targetId` | `string` | ✔ | |
| `reason` | `string` | ✔ | 1–500 chars, enforced by rules |
| `status` | `open` \| `reviewed` \| `dismissed` | ✔ | created `open` |
| `createdAt` | `timestamp` | ✔ | |

---

## 12. Query → index map

Mirrors `firestore.indexes.json`. Anything not listed is served by Firestore's
automatic single-field indexes (equality-only queries, `orderBy` on one field,
and `where(documentId(), 'in', …)`).

| Query (where it comes from) | Required composite index |
| --- | --- |
| Published posts newest-first (`PostService.listPublished`) | `status ↑, publishedAt ↓` |
| …filtered by type (post list type filter) | `status ↑, type ↑, publishedAt ↓` |
| …filtered by category (`CategoryDetailPage`) | `categoryIds ∋, status ↑, publishedAt ↓` |
| …type **and** category together | `categoryIds ∋, status ↑, type ↑, publishedAt ↓` |
| Keyword search on posts/videos (`SearchService`) | `searchKeywords ∋, status ↑, publishedAt ↓` |
| Published videos newest-first | `status ↑, publishedAt ↓` |
| Videos by category | `categoryIds ∋, status ↑, publishedAt ↓` |
| Upcoming events (`EventService.listUpcoming`) | `status ↑, startDate ↑` |
| Past events / calendar (`listPast`, `listBetween`) | `status ↑, startDate ↓` / `status ↑, startDate ↑` |
| Keyword search on events | `searchKeywords ∋, status ↑, startDate ↓` |
| Active categories by order | `isActive ↑, sortOrder ↑` |
| Comments for an item | `itemType ↑, itemId ↑, status ↑, createdAt ↑` |
| A user's comments | `userId ↑, createdAt ↓` |
| A user's likes / bookmarks | `userId ↑, itemType ↑` |

`↑` ascending, `↓` descending, `∋` `array-contains`.

If Firestore reports *"The query requires an index"*, the error message
contains a console link that creates exactly the missing index — then add the
same entry to `firestore.indexes.json` so it survives a re-deploy.

---

## 13. Data lifecycle & consistency

- **No cascading deletes in the database.** `PostService.remove()` and
  `VideoService.remove()` delete the document *and* batch-delete its likes,
  bookmarks and comments in one `writeBatch`; `EventService.remove()` does the
  same minus comments. Content removal is always an explicit confirmed admin
  action, never automatic (§61).
- **Counters can drift by design of the ±1 rule** (a hostile scripted client);
  the dashboard's `getCountFromServer` aggregates show the truth. See
  SECURITY.md §8.1.
- **Events are append-history.** Status transitions only; a past event is never
  rewritten into a draft and never deleted by any code path.
- **Deleting a category does not touch its posts** — `categoryIds` is an array
  of ids on the content, so removal leaves content intact (the UI renders
  "uncategorised" honestly rather than hiding it).

---

## 14. Adding or changing schema

1. Change the model in `src/app/core/models/*.ts` first (draft types keep
   server-owned fields out of forms).
2. Update the writing service (and regenerate `searchKeywords` there).
3. If the collection is new or gains a rule-relevant field, update
   `firestore.rules` **in the same commit** — the catch-all rule makes unknown
   collections deny-all.
4. Add every new query's composite index to `firestore.indexes.json`.
5. Update the table for that collection above.
6. Rules/indexes deploy: `npx firebase-tools deploy --only firestore:rules,firestore:indexes --project <id>`.

There are no migrations today: the schema is additive, and optional fields with
sensible code-side defaults (`?? 0`, `?? null`) keep old documents valid.
