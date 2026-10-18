import { describe, expect, it } from 'vitest';
import { parseYouTubeId, youtubeEmbedUrl, youtubeThumbnailUrl, youtubeWatchUrl } from './youtube';

describe('parseYouTubeId', () => {
  it('parses a standard watch URL', () => {
    expect(parseYouTubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('parses a watch URL with extra query params', () => {
    expect(parseYouTubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s&list=PL1')).toBe(
      'dQw4w9WgXcQ',
    );
  });

  it('parses a youtu.be short link', () => {
    expect(parseYouTubeId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(parseYouTubeId('https://youtu.be/dQw4w9WgXcQ?t=10')).toBe('dQw4w9WgXcQ');
  });

  it('parses embed, shorts and live paths', () => {
    expect(parseYouTubeId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(parseYouTubeId('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(parseYouTubeId('https://www.youtube.com/live/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('accepts mobile and scheme-less URLs', () => {
    expect(parseYouTubeId('https://m.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(parseYouTubeId('youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(parseYouTubeId('www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('accepts a bare 11-character id', () => {
    expect(parseYouTubeId('dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(parseYouTubeId('  dQw4w9WgXcQ  ')).toBe('dQw4w9WgXcQ');
  });

  it('rejects non-YouTube hosts', () => {
    expect(parseYouTubeId('https://evil.com/watch?v=dQw4w9WgXcQ')).toBeNull();
    expect(parseYouTubeId('https://youtube.com.evil.net/watch?v=dQw4w9WgXcQ')).toBeNull();
    expect(parseYouTubeId('https://notyoutube.example/dQw4w9WgXcQ')).toBeNull();
  });

  it('rejects javascript and other non-http schemes', () => {
    expect(parseYouTubeId('javascript:alert(1)')).toBeNull();
    expect(parseYouTubeId('file:///etc/passwd')).toBeNull();
  });

  it('rejects malformed and empty input', () => {
    expect(parseYouTubeId('')).toBeNull();
    expect(parseYouTubeId('   ')).toBeNull();
    expect(parseYouTubeId(null)).toBeNull();
    expect(parseYouTubeId(undefined)).toBeNull();
    expect(parseYouTubeId('https://www.youtube.com/watch?v=short')).toBeNull();
    expect(parseYouTubeId('https://www.youtube.com/watch')).toBeNull();
    expect(parseYouTubeId('https://www.youtube.com/results?search_query=islam')).toBeNull();
    expect(parseYouTubeId('not a url at all')).toBeNull();
  });

  it('rejects ids containing characters outside the YouTube alphabet', () => {
    expect(parseYouTubeId('dQw4w9WgXc!')).toBeNull();
    expect(parseYouTubeId('dQw4w9WgXcQ extra')).toBeNull();
  });
});

describe('url builders', () => {
  it('builds canonical watch, embed and thumbnail URLs', () => {
    expect(youtubeWatchUrl('dQw4w9WgXcQ')).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(youtubeEmbedUrl('dQw4w9WgXcQ')).toBe(
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0&modestbranding=1',
    );
    expect(youtubeThumbnailUrl('dQw4w9WgXcQ')).toBe(
      'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    );
  });
});
