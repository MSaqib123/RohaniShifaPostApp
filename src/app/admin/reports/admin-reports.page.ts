import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ReportDoc, ReportStatus } from '../../core/models';
import { AdminService } from '../../core/services/admin.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { ToastService } from '../../core/services/toast.service';
import { I18nService, TranslationKey } from '../../i18n/i18n.service';
import { ContentStateComponent } from '../../shared/components/content-state';
import { IconComponent } from '../../shared/components/icon/icon';
import { AppDatePipe } from '../../shared/pipes/app-date.pipe';

/**
 * Report queue (§48).
 *
 * A report is a user's claim, not a verdict — nothing is deleted from here.
 * The moderator either records that they reviewed it or dismisses it, and the
 * report stays in the list with that outcome attached.
 */
@Component({
  selector: 'app-admin-reports-page',
  standalone: true,
  imports: [RouterLink, IconComponent, ContentStateComponent, AppDatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-reports.page.html',
  styleUrl: './admin-reports.page.scss',
})
export class AdminReportsPage {
  readonly i18n = inject(I18nService);
  private readonly adminService = inject(AdminService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly error = signal(false);
  readonly reports = signal<ReportDoc[]>([]);
  readonly statusFilter = signal<ReportStatus | null>(null);

  readonly statusOptions: Array<{ value: ReportStatus | null; label: string }> = [
    { value: null, label: this.i18n.t('admin.filterAll') },
    { value: 'open', label: this.i18n.t('admin.reports.status.open') },
    { value: 'reviewed', label: this.i18n.t('admin.reports.status.reviewed') },
    { value: 'dismissed', label: this.i18n.t('admin.reports.status.dismissed') },
  ];

  readonly filtered = computed(() => {
    const status = this.statusFilter();
    return status ? this.reports().filter((report) => report.status === status) : this.reports();
  });

  readonly openCount = computed(
    () => this.reports().filter((report) => report.status === 'open').length,
  );

  constructor() {
    this.load();
  }

  statusLabel(status: ReportStatus): string {
    const keys: Record<ReportStatus, TranslationKey> = {
      open: 'admin.reports.status.open',
      reviewed: 'admin.reports.status.reviewed',
      dismissed: 'admin.reports.status.dismissed',
    };
    return this.i18n.t(keys[status]);
  }

  /** The reported content — comments link to their post/video. */
  targetLink(report: ReportDoc): string[] | null {
    if (report.targetType === 'comment') return null;
    return report.targetType === 'post'
      ? ['/posts', report.targetId]
      : ['/videos', report.targetId];
  }

  targetLabel(report: ReportDoc): string {
    const key: TranslationKey =
      report.targetType === 'post'
        ? 'nav.posts'
        : report.targetType === 'video'
          ? 'nav.videos'
          : 'common.comment';
    return this.i18n.t(key);
  }

  setStatusFilter(status: ReportStatus | null): void {
    this.statusFilter.set(status);
  }

  toStatus(event: Event): ReportStatus | null {
    const value = (event.target as HTMLSelectElement).value;
    return (value || null) as ReportStatus | null;
  }

  retry(): void {
    this.load();
  }

  async resolve(report: ReportDoc, status: 'reviewed' | 'dismissed'): Promise<void> {
    const confirmed = await this.confirm.confirm({
      title: this.i18n.t(
        status === 'reviewed' ? 'admin.reports.markReviewed' : 'admin.reports.dismiss',
      ),
      message: report.reason,
      confirmLabel: this.i18n.t(
        status === 'reviewed' ? 'admin.reports.markReviewed' : 'admin.reports.dismiss',
      ),
      danger: false,
    });
    if (!confirmed) return;

    try {
      await this.adminService.setReportStatus(report.id, status);
      this.reports.update((items) =>
        items.map((item) => (item.id === report.id ? { ...item, status } : item)),
      );
      this.toast.success(
        this.i18n.t(
          status === 'reviewed' ? 'admin.reports.markedReviewed' : 'admin.reports.dismissed',
        ),
      );
    } catch {
      this.toast.error(this.i18n.t('common.errorMessage'));
    }
  }

  private load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.adminService.listReports().subscribe({
      next: (reports) => {
        this.reports.set(reports);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }
}
