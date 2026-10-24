import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { FirebaseIslamicAiService } from './firebase-ai.service';
import { FirebaseService } from '../firebase/firebase.service';

describe('FirebaseIslamicAiService', () => {
  let service: FirebaseIslamicAiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        FirebaseIslamicAiService,
        {
          provide: FirebaseService,
          useValue: {
            configured: false,
            appInstance: null,
            requireApp: () => {
              throw new Error('Not configured in test');
            },
          },
        },
      ],
    });
    service = TestBed.inject(FirebaseIslamicAiService);
  });

  it('should identify authentic Islamic queries', () => {
    expect(service.isIslamicQuery('What is the Dua for anxiety?')).toBe(true);
    expect(service.isIslamicQuery('Virtues of Sabr in Quran')).toBe(true);
    expect(service.isIslamicQuery('نمازِ تہجد کا طریقہ')).toBe(true);
    expect(service.isIslamicQuery('Ayat al-Kursi reflection')).toBe(true);
    expect(service.isIslamicQuery('روحانی شفا اور علاج')).toBe(true);
    expect(service.isIslamicQuery('Sahih Bukhari hadith on honesty')).toBe(true);
  });

  it('should decline secular or non-Islamic queries', () => {
    expect(service.isIslamicQuery('Top 10 Hollywood movies')).toBe(false);
    expect(service.isIslamicQuery('Best online casino games')).toBe(false);
    expect(service.isIslamicQuery('Celebrity gossip and news')).toBe(false);
  });

  it('should return authentic Islamic fallback answer for Islamic query', async () => {
    const res = await service.askIslamicAi('dua for forgiveness', 'en');
    expect(res.isIslamic).toBe(true);
    expect(res.isIslamicOnlyNotice).toBe(false);
    expect(res.answer).toBeTruthy();
    expect(res.source).toBeTruthy();
    expect(res.relatedTopics.length).toBeGreaterThan(0);
  });

  it('should return respectful decline notice for non-Islamic query', async () => {
    const res = await service.askIslamicAi('latest movie release', 'en');
    expect(res.isIslamic).toBe(false);
    expect(res.isIslamicOnlyNotice).toBe(true);
    expect(res.answer).toContain('exclusively to Islamic search');
    expect(res.relatedTopics.length).toBeGreaterThan(0);
  });

  it('should return Urdu decline notice when language is ur', async () => {
    const res = await service.askIslamicAi('action movie watch free', 'ur');
    expect(res.isIslamic).toBe(false);
    expect(res.isIslamicOnlyNotice).toBe(true);
    expect(res.answer).toContain('روحانی شفا AI');
  });
});
