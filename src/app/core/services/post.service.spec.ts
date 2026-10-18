import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';
import { FirebaseNotConfiguredError, FirebaseService } from '../firebase/firebase.service';
import { PostService } from './post.service';

/**
 * PostService without Firebase (demo mode): every public read must degrade to
 * an empty result and every write must fail loudly with a configuration error —
 * never silently pretend a document was saved (§61).
 */
describe('PostService in demo mode', () => {
  let service: PostService;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: FirebaseService,
          useValue: {
            configured: false,
            requireAuth: () => {
              throw new FirebaseNotConfiguredError();
            },
            requireDb: () => {
              throw new FirebaseNotConfiguredError();
            },
          },
        },
      ],
    });
    service = TestBed.inject(PostService);
  });

  it('returns no published posts regardless of filters', async () => {
    expect(await firstValueFrom(service.listPublished())).toEqual([]);
    expect(await firstValueFrom(service.listPublished({ max: 10 }))).toEqual([]);
    expect(
      await firstValueFrom(
        service.listPublished({ type: 'reminder', categoryId: 'c1', featured: true }),
      ),
    ).toEqual([]);
  });

  it('resolves a single post to null', async () => {
    expect(await firstValueFrom(service.get('missing'))).toBeNull();
  });

  it('resolves id lookups to an empty list', async () => {
    expect(await firstValueFrom(service.byIds(['a', 'b', 'c']))).toEqual([]);
    expect(await firstValueFrom(service.byIds([]))).toEqual([]);
  });

  it('reports the admin list as empty rather than failing', async () => {
    expect(await firstValueFrom(service.listAll())).toEqual([]);
  });

  it('refuses writes with a configuration error', async () => {
    const draft = {
      type: 'article',
      title: { en: 'Title' },
      description: { en: '' },
      content: { en: 'Body' },
      categoryIds: [],
      status: 'draft',
      publishedAt: null,
      featured: false,
      tags: [],
      relatedVideoIds: [],
      relatedEventIds: [],
      likesCount: 0,
      commentsCount: 0,
    } as never;

    await expect(service.create('uid-1', draft)).rejects.toBeInstanceOf(FirebaseNotConfiguredError);
    await expect(service.update('post-1', draft)).rejects.toBeInstanceOf(
      FirebaseNotConfiguredError,
    );
    await expect(service.remove('post-1')).rejects.toBeInstanceOf(FirebaseNotConfiguredError);
  });
});
