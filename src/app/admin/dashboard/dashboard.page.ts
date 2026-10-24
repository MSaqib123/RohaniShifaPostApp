import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin, of, switchMap } from 'rxjs';
import { AdminService } from '../../core/services/admin.service';
import { AuthService } from '../../core/auth/auth.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { ToastService } from '../../core/services/toast.service';
import { FirebaseService } from '../../core/firebase/firebase.service';
import { PostService } from '../../core/services/post.service';
import { I18nService, TranslationKey } from '../../i18n/i18n.service';
import { Comment, Post } from '../../core/models';
import { ContentStateComponent } from '../../shared/components/content-state';
import { IconComponent } from '../../shared/components/icon/icon';

export interface DashboardStat {
  key: TranslationKey;
  icon: string;
  value: number;
  route: string;
  badge?: string;
  gradient: string;
}

export interface QuickAction {
  route: string;
  key: TranslationKey;
  icon: string;
}

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
  readonly auth = inject(AuthService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  private readonly postService = inject(PostService);
  readonly firebase = inject(FirebaseService);

  readonly loading = signal(true);
  readonly seeding = signal(false);
  readonly error = signal(false);
  readonly stats = signal<DashboardStat[]>([]);
  readonly recentPosts = signal<Post[]>([]);
  readonly recentComments = signal<Comment[]>([]);

  readonly quickActions: QuickAction[] = [
    { route: '/admin/posts/new', key: 'admin.newPost', icon: 'plus' },
    { route: '/admin/videos/new', key: 'admin.newVideo', icon: 'play' },
    { route: '/admin/categories', key: 'admin.newCategory', icon: 'grid' },
    { route: '/admin/events', key: 'admin.newEvent', icon: 'calendar' },
    { route: '/admin/comments', key: 'admin.comments', icon: 'comment' },
    { route: '/admin/settings', key: 'admin.manageBanner', icon: 'sparkle' },
  ];

  readonly todayFormatted = computed(() => {
    return new Intl.DateTimeFormat(this.i18n.localeOf(), {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date());
  });

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

  resolveTitle(title: any): string {
    if (!title) return '';
    if (typeof title === 'string') return title;
    const lang = this.i18n.language();
    return title[lang] || title['ur'] || title['en'] || title['ar'] || '';
  }

  formatDate(timestamp: any): string {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return new Intl.DateTimeFormat(this.i18n.localeOf(), {
      dateStyle: 'medium',
    }).format(date);
  }

  private load(): void {
    this.loading.set(true);
    this.error.set(false);

    forkJoin({
      posts: this.admin.countQuery('posts'),
      videos: this.admin.countQuery('videos'),
      users: this.admin.countQuery('users'),
      events: this.admin.countQuery('events'),
      comments: this.admin.countQuery('comments'),
      categories: this.admin.countQuery('categories'),
    }).subscribe({
      next: ({ posts, videos, users, events, comments, categories }) => {
        this.stats.set([
          {
            key: 'admin.totalPosts',
            icon: 'post',
            value: posts,
            route: '/admin/posts',
            badge: 'Articles',
            gradient: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
          },
          {
            key: 'admin.totalVideos',
            icon: 'video',
            value: videos,
            route: '/admin/videos',
            badge: 'YouTube',
            gradient: 'linear-gradient(135deg, #f59e0b 0%, #b45309 100%)',
          },
          {
            key: 'admin.totalUsers',
            icon: 'users',
            value: users,
            route: '/admin/users',
            badge: 'Community',
            gradient: 'linear-gradient(135deg, #06b6d4 0%, #0e7490 100%)',
          },
          {
            key: 'admin.upcomingEvents',
            icon: 'calendar',
            value: events,
            route: '/admin/events',
            badge: 'Schedule',
            gradient: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
          },
          {
            key: 'admin.totalComments',
            icon: 'comment',
            value: comments,
            route: '/admin/comments',
            badge: 'Engage',
            gradient: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
          },
          {
            key: 'admin.totalCategories',
            icon: 'grid',
            value: categories,
            route: '/admin/categories',
            badge: 'Topics',
            gradient: 'linear-gradient(135deg, #eab308 0%, #a16207 100%)',
          },
        ]);

        // Fetch recent posts
        this.postService.listAll(6).subscribe({
          next: (p) => this.recentPosts.set(p),
          error: () => {},
        });

        // Fetch recent comments
        this.admin.listComments(5).subscribe({
          next: (c) => this.recentComments.set(c),
          error: () => {},
        });

        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }
}
