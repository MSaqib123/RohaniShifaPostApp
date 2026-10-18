import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Timestamp } from 'firebase/firestore';
import { Category, EventDraft, EventItem, EventStatus } from '../../core/models';
import { LocalizedText } from '../../i18n/language.types';
import { AuthService } from '../../core/auth/auth.service';
import { CategoryService } from '../../core/services/category.service';
import { EventService } from '../../core/services/event.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { ToastService } from '../../core/services/toast.service';
import { I18nService, TranslationKey } from '../../i18n/i18n.service';
import { ContentStateComponent } from '../../shared/components/content-state';
import { IconComponent } from '../../shared/components/icon/icon';
import { LocalizedInput } from '../../shared/components/localized-input';
import { AppDatePipe } from '../../shared/pipes/app-date.pipe';

type TextField = 'location' | 'meetingUrl';

const EVENT_STATUSES: readonly EventStatus[] = ['draft', 'published', 'completed', 'cancelled'];

/** Editable event state — `datetime-local` strings instead of Timestamps. */
interface EventEditor {
  id: string | null;
  title: LocalizedText;
  description: LocalizedText;
  start: string;
  end: string;
  location: string;
  isOnline: boolean;
  meetingUrl: string;
  categoryId: string | null;
  status: EventStatus;
}

const emptyText = (): LocalizedText => ({ en: '' });

const blankEditor = (): EventEditor => ({
  id: null,
  title: emptyText(),
  description: emptyText(),
  start: '',
  end: '',
  location: '',
  isOnline: false,
  meetingUrl: '',
  categoryId: null,
  status: 'published',
});

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** `Timestamp` → value for `<input type="datetime-local">`. */
function toInputValue(value: Timestamp | null | undefined): string {
  if (!value) return '';
  const date = value.toDate();
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

/** `<input type="datetime-local">` value → `Timestamp` (null when empty/invalid). */
function fromInputValue(value: string): Timestamp | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : Timestamp.fromDate(date);
}

/**
 * Event management (§17).
 *
 * The archive rule lives in this UI: past events are completed or cancelled —
 * never silently deleted. Hard delete is offered only for drafts, and every
 * destructive action asks for confirmation first (§61).
 */
@Component({
  selector: 'app-admin-events-page',
  standalone: true,
  imports: [IconComponent, ContentStateComponent, LocalizedInput, AppDatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-events.page.html',
  styleUrl: './admin-events.page.scss',
})
export class AdminEventsPage {
  readonly i18n = inject(I18nService);
  private readonly eventService = inject(EventService);
  private readonly categoryService = inject(CategoryService);
  private readonly auth = inject(AuthService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly error = signal(false);
  readonly events = signal<EventItem[]>([]);
  readonly categories = signal<Category[]>([]);
  readonly searchTerm = signal('');
  readonly statusFilter = signal<EventStatus | null>(null);

  readonly editor = signal<EventEditor | null>(null);
  readonly saving = signal(false);
  readonly formError = signal('');

  readonly isNew = computed(() => this.editor()?.id === null);
  readonly statusOptions = EVENT_STATUSES.map((value) => ({ value }));

  readonly filtered = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const status = this.statusFilter();
    return this.events().filter((event) => {
      if (status && event.status !== status) return false;
      if (!term) return true;
      return this.titleOf(event).toLowerCase().includes(term);
    });
  });

  readonly hasFilters = computed(
    () => this.searchTerm().trim().length > 0 || this.statusFilter() !== null,
  );

  constructor() {
    this.categoryService.listActive().subscribe({
      next: (categories) => this.categories.set(categories),
      error: () => this.categories.set([]),
    });
    this.load();
  }

  titleOf(event: EventItem): string {
    return this.i18n.localized(event.title) || this.i18n.t('common.untitled');
  }

  statusLabel(status: EventStatus): string {
    const keys: Record<EventStatus, TranslationKey> = {
      draft: 'events.draft',
      published: 'events.published',
      completed: 'events.completed',
      cancelled: 'events.cancelled',
    };
    return this.i18n.t(keys[status]);
  }

  /** True once the start date has passed — the archive rule applies (§17). */
  isPast(event: EventItem): boolean {
    return event.startDate.toDate().getTime() < Date.now();
  }

  /** Past published events must be completed/cancelled, not deleted (§17). */
  canDelete(event: EventItem): boolean {
    return event.status === 'draft' && !this.isPast(event);
  }

  onSearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  setStatusFilter(status: EventStatus | null): void {
    this.statusFilter.set(status);
  }

  toStatus(event: Event): EventStatus | null {
    const value = (event.target as HTMLSelectElement).value;
    return (value || null) as EventStatus | null;
  }

  clearFilters(): void {
    this.searchTerm.set('');
    this.statusFilter.set(null);
  }

  retry(): void {
    this.load();
  }

  // ── Editor ────────────────────────────────────────────────────────────────

  startNew(): void {
    this.formError.set('');
    this.editor.set(blankEditor());
  }

  startEdit(item: EventItem): void {
    this.formError.set('');
    this.editor.set({
      id: item.id,
      title: item.title,
      description: item.description,
      start: toInputValue(item.startDate),
      end: toInputValue(item.endDate),
      location: item.location ?? '',
      isOnline: item.isOnline,
      meetingUrl: item.meetingUrl ?? '',
      categoryId: item.categoryId ?? null,
      status: item.status,
    });
  }

  cancelEdit(): void {
    this.editor.set(null);
    this.formError.set('');
  }

  patchEditor(partial: Partial<EventEditor>): void {
    this.editor.update((current) => (current ? { ...current, ...partial } : current));
  }

  setText(field: TextField, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.editor.update((current) => {
      if (!current) return current;
      return field === 'location'
        ? { ...current, location: value }
        : { ...current, meetingUrl: value };
    });
  }

  setDate(field: 'start' | 'end', event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.editor.update((current) => {
      if (!current) return current;
      return field === 'start' ? { ...current, start: value } : { ...current, end: value };
    });
  }

  setIsOnline(event: Event): void {
    this.patchEditor({ isOnline: (event.target as HTMLInputElement).checked });
  }

  setCategoryId(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.patchEditor({ categoryId: value || null });
  }

  setEditorStatus(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as EventStatus;
    this.patchEditor({ status: value });
  }

  onSubmit(event: Event): void {
    event.preventDefault();
    void this.save();
  }

  async save(): Promise<void> {
    const editor = this.editor();
    if (!editor) return;
    if (!editor.title.en?.trim()) {
      this.formError.set(this.i18n.t('admin.eventForm.requiredTitle'));
      return;
    }
    const startDate = fromInputValue(editor.start);
    if (!startDate) {
      this.formError.set(this.i18n.t('admin.eventForm.dateRequired'));
      return;
    }

    const createdBy = this.auth.profile()?.uid ?? this.auth.user()?.uid ?? '';
    if (!editor.id && !createdBy) {
      this.formError.set(this.i18n.t('common.loginRequiredMessage'));
      return;
    }

    this.saving.set(true);
    this.formError.set('');

    const draft: EventDraft = {
      title: this.compact(editor.title),
      description: this.compact(editor.description),
      startDate,
      endDate: fromInputValue(editor.end),
      location: editor.location.trim() || undefined,
      isOnline: editor.isOnline,
      meetingUrl: editor.isOnline ? editor.meetingUrl.trim() || undefined : undefined,
      categoryId: editor.categoryId,
      relatedPostIds: [],
      relatedVideoIds: [],
      status: editor.status,
    };

    try {
      if (editor.id) {
        await this.eventService.update(editor.id, draft);
        this.toast.success(this.i18n.t('admin.eventForm.updated'));
      } else {
        await this.eventService.create(createdBy, draft);
        this.toast.success(this.i18n.t('admin.eventForm.created'));
      }
      this.editor.set(null);
      this.load();
    } catch (err: unknown) {
      console.error('Event save failed:', err);
      const message = err instanceof Error ? err.message : this.i18n.t('common.errorMessage');
      this.formError.set(message);
    } finally {
      this.saving.set(false);
    }
  }

  // ── Row actions ───────────────────────────────────────────────────────────

  async changeStatus(item: EventItem, status: EventStatus): Promise<void> {
    if (status === item.status) return;
    try {
      await this.eventService.markStatus(item.id, status);
      this.events.update((items) =>
        items.map((event) => (event.id === item.id ? { ...event, status } : event)),
      );
      this.toast.success(this.statusLabel(status));
    } catch {
      this.toast.error(this.i18n.t('common.errorMessage'));
    }
  }

  async remove(item: EventItem): Promise<void> {
    const confirmed = await this.confirm.confirm({
      title: this.i18n.t('admin.confirmedDeleteTitle', { title: this.titleOf(item) }),
      message: this.i18n.t('admin.eventForm.deleteTitle'),
      confirmLabel: this.i18n.t('common.delete'),
      danger: true,
    });
    if (!confirmed) return;

    try {
      await this.eventService.remove(item.id);
      this.events.update((items) => items.filter((event) => event.id !== item.id));
      if (this.editor()?.id === item.id) this.editor.set(null);
      this.toast.success(this.i18n.t('admin.eventForm.deleted'));
    } catch {
      this.toast.error(this.i18n.t('common.errorMessage'));
    }
  }

  private compact(value: LocalizedText): LocalizedText {
    const result: LocalizedText = { en: value.en ?? '' };
    if (value.ur?.trim()) result.ur = value.ur;
    if (value.ar?.trim()) result.ar = value.ar;
    return result;
  }

  private load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.eventService.listAll().subscribe({
      next: (events) => {
        this.events.set(events);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }
}
