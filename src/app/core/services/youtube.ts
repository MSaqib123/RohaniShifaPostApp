/**
 * YouTube URL/ID parser (§13, §61).
 *
 * Embed-only platform: admins paste any common YouTube link and we extract the
 * 11-character video ID. Everything here is pure — no DOM, no network — which
 * is exactly what makes it unit-testable (see `youtube.spec.ts`).
 *
 * Supported forms:
 *  • https://www.youtube.com/watch?v=VIDEOID
 *  • https://youtube.com/watch?v=VIDEOID&t=42s
 *  • https://youtu.be/VIDEOID
 *  • https://www.youtube.com/embed/VIDEOID
 *  • https://www.youtube.com/shorts/VIDEOID
 *  • https://m.youtube.com/watch?v=VIDEOID
 *  • raw 11-character ID (pasted from an export/tool)
 *
 * Deliberately rejected: any host that is not YouTube (avoids `evil.com/?v=`),
 * IDs with the wrong length/characters, and non-http(s) schemes.
 */

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

/** Hosts that legitimately carry a YouTube video id. */
const ALLOWED_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtu.be',
  'www.youtu.be',
]);

/** Path prefixes that address a single video directly. */
const ID_PATHS = ['/embed/', '/shorts/', '/live/', '/v/'];

function isValidId(value: string | null | undefined): value is string {
  return !!value && YOUTUBE_ID.test(value);
}

/**
 * Extract the video id from a URL or bare id.
 * Returns `null` when the input is not a recognisable YouTube video link.
 */
export function parseYouTubeId(input: string | null | undefined): string | null {
  const raw = (input ?? '').trim();
  if (!raw) return null;

  // Bare id shortcut — cheap and common when copying from a spreadsheet.
  if (isValidId(raw)) return raw;

  let url: URL;
  try {
    // Some editors paste "youtube.com/watch?v=…" without a scheme.
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return null;
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  if (!ALLOWED_HOSTS.has(url.hostname.toLowerCase())) return null;

  // youtu.be/<id> — the id IS the path.
  if (url.hostname.toLowerCase().endsWith('youtu.be')) {
    const id = url.pathname.split('/').filter(Boolean)[0];
    return isValidId(id) ? id : null;
  }

  // youtube.com/watch?v=<id>
  const queryId = url.searchParams.get('v');
  if (isValidId(queryId)) return queryId;

  // youtube.com/embed|shorts|live|v/<id>
  const segments = url.pathname.split('/').filter(Boolean);
  if (segments.length >= 2 && ID_PATHS.includes(`/${segments[0]}/`)) {
    return isValidId(segments[1]) ? segments[1] : null;
  }

  return null;
}

/** Canonical watch URL for a video id (used for sharing/`youtubeUrl`). */
export function youtubeWatchUrl(id: string): string {
  return `https://www.youtube.com/watch?v=${id}`;
}

/**
 * Privacy-enhanced embed URL (`youtube-nocookie.com`) with `origin` removed so
 * the iframe keeps working on GitHub Pages sub-paths (§13).
 */
export function youtubeEmbedUrl(id: string): string {
  return `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1`;
}

/** `i.ytimg.com` thumbnail — always available, no API key needed. */
export function youtubeThumbnailUrl(id: string): string {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}
