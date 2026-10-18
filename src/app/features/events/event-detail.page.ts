import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subject, combineLatest, map, startWith } from 'rxjs';
import { siteConfig } from '../../config/site.config';
import { EventItem, Post, Video } from '../../core/models';
import { EventService } from '../../core/services/event.service';
import { PostService } from '../../core/services/post.service';
import { SeoService, jsonLdDate } from '../../core/services/seo.service';
import { VideoService } from '../../core/services/video.service';
import { I18nService } from '../../i18n/i18n.service';
import { ContentStateComponent } from '../../shared/components/content-state';
import { EngagementBar } from '../../shared/components/engagement-bar';
import { IconComponent } from '../../shared/components/icon/icon';
import { PostCard } from '../../shared/components/post-card';
import { ShareBar } from '../../shared/components/share-bar';
import { VideoCard } from '../../shared/components/video-card';
import { AppDatePipe } from '../../shared/pipes/app-date.pipe';

/**
 * Single event view (§17, §24).
 *
 * Status is always stated plainly — a cancelled event shows its notice, a
 * past event explains that it already happened (the archive never lies), and
 * the meeting link only appears for online events that actually have one.
 */
@Component({
  selector: 'app-event-detail-page',
  standalone: true,
  imports: [
    RouterLink,
    IconComponent,
    ContentStateComponent,
    AppDatePipe,
    PostCard,
    VideoCard,
    ShareBar,
    EngagementBar,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './event-detail.page.html',
  styleUrl: './event-detail.page.scss',
})
export class EventDetailPage {
  readonly i18n = inject(I18nService);
  private readonly eventService = inject(EventService);
  private readonly postService = inject(PostService);
  private readonly videoService = inject(VideoService);
  private readonly route = inject(ActivatedRoute);
  private readonly seo = inject(SeoService);

  private readonly retry$ = new Subject<void>();

  private readonly state = signal<{
    loading: boolean;
    error: boolean;
    event: EventItem | null;
  }>({ loading: true, error: false, event: null });

  readonly loading = computed(() => this.state().loading);
  readonly error = computed(() => this.state().error);
  readonly event = computed(() => this.state().event);

  readonly relatedPosts = signal<Post[]>([]);
  readonly relatedVideos = signal<Video[]>([]);

  readonly description = computed(() => this.i18n.localized(this.event()?.description ?? ''));

  readonly isPast = computed(() => {
    const event = this.event();
    return event ? event.startDate.toDate().getTime() < Date.now() : false;
  });

  readonly paragraphs = computed(() =>
    this.description()
      .split(/\n{2,}/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean),
  );

  constructor() {
    combineLatest([
      this.route.paramMap.pipe(map((params) => params.get('id') ?? '')),
      this.retry$.pipe(startWith(0)),
    ]).subscribe(([id]) => this.load(id));

    // Per-event SEO (§31): unique metadata + Event JSON-LD carrying the real
    // date, attendance mode and (only for online events) the meeting URL —
    // the archive stays truthful: a cancelled event says so in structured
    // data too. Re-runs on language switch for translated metadata.
    effect(() => {
      const event = this.event();
      if (!event) return;
      const title = this.i18n.localized(event.title);
      const description = this.i18n.localized(event.description).trim() || undefined;
      const start = jsonLdDate(event.startDate);
      const end = jsonLdDate(event.endDate);
      const location = event.location?.trim();

      this.seo.setPage({
        title,
        description,
        type: 'event',
        jsonLd: {
          '@type': 'Event',
          name: title,
          ...(description ? { description } : {}),
          ...(start ? { startDate: start } : {}),
          ...(end ? { endDate: end } : {}),
          eventStatus:
            event.status === 'cancelled'
              ? 'https://schema.org/EventCancelled'
              : 'https://schema.org/EventScheduled',
          eventAttendanceMode: event.isOnline
            ? 'https://schema.org/OnlineEventAttendanceMode'
            : 'https://schema.org/OfflineEventAttendanceMode',
          location: event.isOnline
            ? { '@type': 'VirtualLocation', ...(event.meetingUrl ? { url: event.meetingUrl } : {}) }
            : { '@type': 'Place', name: location || siteConfig.name },
          organizer: { '@type': 'Organization', name: siteConfig.name },
        },
      });
    });
  }

  retry(): void {
    this.retry$.next();
  }

  private load(id: string): void {
    if (!id) {
      this.state.set({ loading: false, error: false, event: null });
      return;
    }
    this.state.set({ loading: true, error: false, event: null });
    this.eventService.get(id).subscribe({
      next: (event) => {
        this.state.set({ loading: false, error: false, event });
        this.loadRelated(event);
      },
      error: () => this.state.set({ loading: false, error: true, event: null }),
    });
  }

  private loadRelated(event: EventItem | null): void {
    const postIds = (event?.relatedPostIds ?? []).slice(0, 3);
    const videoIds = (event?.relatedVideoIds ?? []).slice(0, 3);

    this.relatedPosts.set([]);
    this.relatedVideos.set([]);

    if (postIds.length > 0) {
      this.postService.byIds(postIds).subscribe({
        next: (posts) => this.relatedPosts.set(posts),
        error: () => this.relatedPosts.set([]),
      });
    }
    if (videoIds.length > 0) {
      this.videoService.byIds(videoIds).subscribe({
        next: (videos) => this.relatedVideos.set(videos),
        error: () => this.relatedVideos.set([]),
      });
    }
  }
}
