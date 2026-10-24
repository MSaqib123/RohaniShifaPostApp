import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, switchMap } from 'rxjs';
import { SearchResult, SearchService } from '../../core/services/search.service';
import { FirebaseIslamicAiService, IslamicAiResponse } from '../../core/services/firebase-ai.service';
import { ToastService } from '../../core/services/toast.service';
import { I18nService, TranslationKey } from '../../i18n/i18n.service';
import { ContentStateComponent } from '../../shared/components/content-state';
import { IconComponent } from '../../shared/components/icon/icon';

type Tab = 'all' | SearchResult['kind'];

/** Keep typing snappy but avoid a query per keystroke. */
const DEBOUNCE_MS = 250;
/** Firestore-honest search: the box explains itself instead of pretending. */
const MIN_CHARS = 3;

/**
 * Cross-content search (§21).
 *
 * Runs the Firestore prefix query — no client-side illusion of search over
 * data we never loaded. Results, empty state and note all describe what
 * actually happens, including the prefix behaviour.
 */
@Component({
  selector: 'app-search-page',
  standalone: true,
  imports: [RouterLink, IconComponent, ContentStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './search.page.html',
  styleUrl: './search.page.scss',
})
export class SearchPage {
  readonly i18n = inject(I18nService);
  private readonly searchService = inject(SearchService);
  private readonly islamicAiService = inject(FirebaseIslamicAiService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly query = signal(this.route.snapshot.queryParamMap.get('q') ?? '');
  readonly activeTab = signal<Tab>('all');
  readonly searching = signal(false);
  readonly searched = signal(false);
  readonly results = signal<SearchResult[]>([]);

  // ── Firebase Islamic AI State ─────────────────────────────────────────────
  readonly aiResponse = signal<IslamicAiResponse | null>(null);
  readonly aiSearching = signal(false);

  /** Pre-configured Islamic prompt suggestions for instant exploration. */
  readonly promptChips = [
    { label: 'Dua for peace & anxiety', query: 'Dua for peace and anxiety' },
    { label: 'Virtues of Sabr (Patience)', query: 'Virtues of Sabr' },
    { label: 'Tahajjud Prayer guide', query: 'How to perform Tahajjud' },
    { label: 'Ayat al-Kursi benefits', query: 'Ayat al Kursi benefits' },
    { label: 'Rohani Shifa for illness', query: 'Islamic healing and Rohani Shifa' },
    { label: 'Repentance (Tawbah)', query: 'How to make true Tawbah' },
  ];

  private readonly terms$ = new Subject<string>();

  /** Tab labels stay data-driven so `search.*` keys never scatter. */
  readonly tabs: Array<{ value: Tab; key: TranslationKey }> = [
    { value: 'all', key: 'search.all' },
    { value: 'post', key: 'search.posts' },
    { value: 'video', key: 'search.videos' },
    { value: 'event', key: 'search.events' },
  ];

  constructor() {
    this.terms$
      .pipe(
        debounceTime(DEBOUNCE_MS),
        distinctUntilChanged(),
        switchMap((term) => {
          if (term.trim().length < MIN_CHARS) {
            this.searching.set(false);
            this.searched.set(false);
            this.results.set([]);
            this.aiResponse.set(null);
            this.aiSearching.set(false);
            return [];
          }
          this.searching.set(true);
          void this.runAiSearch(term);
          return this.searchService.search(term);
        }),
      )
      .subscribe((response) => {
        if (!response) return;
        this.results.set(response.results);
        this.searching.set(false);
        this.searched.set(true);
        void this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { q: response.query || null },
          replaceUrl: true,
        });
      });

    const initial = this.query();
    if (initial) this.search(initial);
  }

  async runAiSearch(term: string): Promise<void> {
    const q = term.trim();
    if (q.length < MIN_CHARS) return;
    this.aiSearching.set(true);
    try {
      const resp = await this.islamicAiService.askIslamicAi(q, this.i18n.language());
      this.aiResponse.set(resp);
    } catch (err) {
      console.error('Islamic AI Search error:', err);
    } finally {
      this.aiSearching.set(false);
    }
  }

  async copyAiAnswer(): Promise<void> {
    const resp = this.aiResponse();
    if (!resp) return;
    const textToCopy = `${resp.answer}\n\nSource: ${resp.source || 'Rohani Shifa Islamic AI'}`;
    try {
      await navigator.clipboard.writeText(textToCopy);
      this.toast.success(this.i18n.t('search.answerCopied'));
    } catch {
      this.toast.error(this.i18n.t('common.errorMessage'));
    }
  }

  onSuggestedTopicClick(topic: string): void {
    this.search(topic);
  }

  onInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.query.set(value);
    this.terms$.next(value);
  }

  search(term: string): void {
    this.query.set(term);
    this.terms$.next(term);
  }

  clearSearch(): void {
    this.query.set('');
    this.terms$.next('');
  }

  onSubmit(): void {
    const q = this.query().trim();
    if (q.length >= MIN_CHARS) {
      this.search(q);
    }
  }

  setTab(tab: Tab): void {
    this.activeTab.set(tab);
  }

  kindLabel(kind: SearchResult['kind']): string {
    const key: TranslationKey =
      kind === 'post'
        ? 'search.posts'
        : kind === 'video'
          ? 'search.videos'
          : kind === 'event'
            ? 'search.events'
            : 'nav.categories';
    return this.i18n.t(key);
  }

  kindIcon(kind: SearchResult['kind']): string {
    return kind === 'post'
      ? 'post'
      : kind === 'video'
        ? 'video'
        : kind === 'event'
          ? 'calendar'
          : 'grid';
  }

  readonly visibleResults = computed(() => {
    const tab = this.activeTab();
    return tab === 'all' ? this.results() : this.results().filter((result) => result.kind === tab);
  });

  /** Distinct kinds present — drives the tab bar without hard-coded counts. */
  readonly availableTabs = computed(() => {
    const kinds = new Set(this.results().map((result) => result.kind));
    return this.tabs.filter(
      (tab) => tab.value === 'all' || kinds.has(tab.value as SearchResult['kind']),
    );
  });

  readonly showEmpty = computed(
    () => !this.searching() && this.searched() && this.results().length === 0,
  );
}
