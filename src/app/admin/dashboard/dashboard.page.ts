import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AdminService } from '../../core/services/admin.service';
import { AuthService } from '../../core/auth/auth.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { ToastService } from '../../core/services/toast.service';
import { FirebaseService } from '../../core/firebase/firebase.service';
import { I18nService, TranslationKey } from '../../i18n/i18n.service';
import { ContentStateComponent } from '../../shared/components/content-state';
import { IconComponent } from '../../shared/components/icon/icon';

interface Stat {
  key: TranslationKey;
  icon: string;
  value: number;
}

interface QuickAction {
  route: string;
  key: TranslationKey;
  icon: string;
}

/**
 * Admin dashboard (§22).
 *
 * Counts come from Firestore's count aggregate — the dashboard reads no
 * documents, so it stays fast and cheap as content grows.
 */
@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [RouterLink, IconComponent, ContentStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard.page.html',
  styleUrl: './dashboard.page.scss',
})
export class DashboardPage {
  readonly i18n = inject(I18nService);
  private readonly admin = inject(AdminService);
  private readonly auth = inject(AuthService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  readonly firebase = inject(FirebaseService);

  readonly loading = signal(true);
  readonly seeding = signal(false);
  readonly error = signal(false);
  readonly stats = signal<Stat[]>([]);

  readonly quickActions: QuickAction[] = [
    { route: '/admin/posts/new', key: 'admin.newPost', icon: 'plus' },
    { route: '/admin/videos/new', key: 'admin.newVideo', icon: 'plus' },
    { route: '/admin/categories', key: 'admin.newCategory', icon: 'grid' },
    { route: '/admin/events', key: 'admin.newEvent', icon: 'calendar' },
  ];

  constructor() {
    this.load();
  }

  retry(): void {
    this.load();
  }

  async onSeedDemoData(): Promise<void> {
    const ok = await this.confirm.confirm({
      title: this.i18n.t('admin.seedDemoDataConfirm'),
      confirmLabel: this.i18n.t('admin.seedDemoData'),
    });
    if (!ok) return;

    this.seeding.set(true);
    try {
      const uid = this.auth.user()?.uid ?? 'admin';
      await this.admin.seedSampleData(uid);
      this.toast.success(this.i18n.t('admin.seedDemoDataSuccess'));
      this.load();
    } catch {
      this.toast.error(this.i18n.t('common.errorMessage'));
    } finally {
      this.seeding.set(false);
    }
  }

  private load(): void {
    this.loading.set(true);
    this.error.set(false);

    forkJoin({
      posts: this.admin.countQuery('posts'),
      videos: this.admin.countQuery('videos'),
      users: this.admin.countQuery('users'),
      events: this.admin.countQuery('events'),
    }).subscribe({
      next: ({ posts, videos, users, events }) => {
        this.stats.set([
          { key: 'admin.totalPosts', icon: 'post', value: posts },
          { key: 'admin.totalVideos', icon: 'video', value: videos },
          { key: 'admin.totalUsers', icon: 'users', value: users },
          { key: 'admin.upcomingEvents', icon: 'calendar', value: events },
        ]);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }
}
