import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin, of, switchMap } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { SessionService } from '../../core/auth/session.service';
import { BookmarkDoc, Comment, LikeDoc, Post, Video } from '../../core/models';
import { ConfirmService } from '../../core/services/confirm.service';
import { EngagementService } from '../../core/services/engagement.service';
import { PostService } from '../../core/services/post.service';
import { ToastService } from '../../core/services/toast.service';
import { VideoService } from '../../core/services/video.service';
import { I18nService } from '../../i18n/i18n.service';
import { LanguageSwitcher } from '../../i18n/language-switcher';
import { IconComponent } from '../../shared/components/icon/icon';
import { ThemeSwitcherComponent } from '../../shared/components/theme-switcher/theme-switcher';

export interface ActivityItem {
  id: string;
  itemId: string;
  itemType: 'post' | 'video' | 'event';
  title: string;
  category?: string;
  coverImage?: string;
  route: string;
  createdAt?: any;
}

export type ProfileTab = 'bookmarks' | 'likes' | 'comments';

@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [RouterLink, IconComponent, LanguageSwitcher, ThemeSwitcherComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="section container profile">
      <header class="section-head">
        <div class="section-head__titles">
          <span class="section-head__kicker">{{ i18n.t('profile.manageAccount') }}</span>
          <h1 class="section-head__title">{{ i18n.t('profile.title') }}</h1>
        </div>
        <div class="section-head__actions">
          <button type="button" class="btn btn--outline btn--sm" (click)="session.logout()">
            <app-icon name="logout" />
            {{ i18n.t('nav.logout') }}
          </button>
        </div>
      </header>

      <div class="profile__grid">
        <!-- Account Card -->
        <article class="card profile__card">
          <div class="profile__identity">
            <div class="avatar-upload-wrapper">
              <span class="avatar avatar--xl profile-avatar" aria-hidden="true">
                @if (auth.photoURL(); as photo) {
                  <img [src]="photo" [alt]="auth.displayName()" />
                } @else {
                  {{ auth.initials() }}
                }
                @if (savingPhoto()) {
                  <div class="avatar-upload-overlay" aria-hidden="true">
                    <span class="spinner spinner--sm"></span>
                  </div>
                }
              </span>
              <button
                type="button"
                class="avatar-upload-btn"
                [attr.aria-label]="i18n.t('profile.uploadPhoto')"
                [title]="i18n.t('profile.uploadPhoto')"
                (click)="avatarFileInput.click()"
                [disabled]="savingPhoto()"
              >
                <app-icon name="image" />
              </button>
              <input
                #avatarFileInput
                type="file"
                class="sr-only"
                accept="image/jpeg,image/png,image/webp"
                (change)="onPhotoSelected($event)"
              />
            </div>

            <div class="profile__identity-info">
              <h2>{{ auth.displayName() }}</h2>
              <p class="profile__email">{{ auth.user()?.email }}</p>
              <div class="profile__badges">
                <span class="badge badge--gold">{{ roleLabel() }}</span>
                @if (auth.photoURL()) {
                  <button
                    type="button"
                    class="btn-text-danger"
                    (click)="removePhoto()"
                    [disabled]="savingPhoto()"
                  >
                    <app-icon name="trash" />
                    {{ i18n.t('profile.removePhoto') }}
                  </button>
                }
              </div>
            </div>
          </div>

          <div class="profile__photo-actions">
            <button
              type="button"
              class="btn btn--outline btn--sm"
              (click)="avatarFileInput.click()"
              [disabled]="savingPhoto()"
            >
              <app-icon name="image" />
              {{ auth.photoURL() ? i18n.t('profile.changePhoto') : i18n.t('profile.uploadPhoto') }}
            </button>
            <span class="profile__photo-hint">{{ i18n.t('profile.photoHint') }}</span>
          </div>

          @if (memberSince(); as since) {
            <p class="meta-row">
              <app-icon name="calendar" />
              {{ i18n.t('profile.memberSince', { date: since }) }}
            </p>
          }
          @if (!auth.emailVerified()) {
            <div class="alert alert--warning">
              {{ i18n.t('auth.verifyEmailNotice') }}
            </div>
          }
        </article>

        <!-- Preferences Card -->
        <article class="card profile__card">
          <h2>{{ i18n.t('profile.languagePreference') }}</h2>
          <app-language-switcher />

          <hr class="profile__divider" />

          <h2>{{ i18n.t('profile.themePreference') }}</h2>
          <app-theme-switcher mode="segmented" />
        </article>

        <!-- Activity & Favorites Area -->
        <article class="card profile__card profile__card--wide">
          <div class="profile__tabs-bar">
            <button
              type="button"
              class="profile__tab-btn"
              [class.is-active]="selectedTab() === 'bookmarks'"
              (click)="selectedTab.set('bookmarks')"
            >
              <app-icon name="bookmark" />
              <span>{{ i18n.t('profile.bookmarks') }}</span>
              <span class="tab-badge">{{ bookmarksList().length }}</span>
            </button>

            <button
              type="button"
              class="profile__tab-btn"
              [class.is-active]="selectedTab() === 'likes'"
              (click)="selectedTab.set('likes')"
            >
              <app-icon name="heart" />
              <span>{{ i18n.t('profile.likedPosts') }}</span>
              <span class="tab-badge">{{ likesList().length }}</span>
            </button>

            <button
              type="button"
              class="profile__tab-btn"
              [class.is-active]="selectedTab() === 'comments'"
              (click)="selectedTab.set('comments')"
            >
              <app-icon name="comment" />
              <span>{{ i18n.t('profile.myComments') }}</span>
              <span class="tab-badge">{{ commentsList().length }}</span>
            </button>
          </div>

          <!-- Loading State -->
          @if (loadingActivity()) {
            <div class="activity-loading">
              <span class="spinner spinner--md"></span>
            </div>
          } @else {
            <!-- 1. Bookmarks Tab -->
            @if (selectedTab() === 'bookmarks') {
              @if (bookmarksList().length === 0) {
                <div class="state state--sm">
                  <app-icon name="bookmark" />
                  <p>{{ i18n.t('profile.noBookmarks') }}</p>
                  <p class="state__hint">{{ i18n.t('profile.noBookmarksMessage') }}</p>
                  <a routerLink="/posts" class="btn btn--outline btn--sm" style="margin-block-start: 0.5rem">
                    <app-icon name="compass" />
                    {{ i18n.t('profile.exploreContent') }}
                  </a>
                </div>
              } @else {
                <div class="activity-grid">
                  @for (item of bookmarksList(); track item.id) {
                    <div class="activity-card">
                      <div class="activity-card__thumb">
                        @if (item.coverImage) {
                          <img [src]="item.coverImage" [alt]="item.title" />
                        } @else {
                          <div class="activity-card__placeholder">
                            <app-icon [name]="item.itemType === 'video' ? 'video' : 'post'" />
                          </div>
                        }
                        <span class="activity-card__tag badge badge--gold">
                          {{ item.itemType === 'video' ? 'Video' : 'Article' }}
                        </span>
                      </div>
                      <div class="activity-card__body">
                        <h4 class="activity-card__title">{{ item.title }}</h4>
                        <div class="activity-card__actions">
                          <a [routerLink]="item.route" class="btn btn--sm btn--gold">
                            <app-icon [name]="item.itemType === 'video' ? 'play' : 'book'" />
                            {{ item.itemType === 'video' ? i18n.t('profile.watchVideo') : i18n.t('profile.readPost') }}
                          </a>
                          <button
                            type="button"
                            class="btn-icon-danger"
                            (click)="removeBookmark(item)"
                            [attr.aria-label]="i18n.t('profile.removeBookmark')"
                            [title]="i18n.t('profile.removeBookmark')"
                          >
                            <app-icon name="trash" />
                          </button>
                        </div>
                      </div>
                    </div>
                  }
                </div>
              }
            }

            <!-- 2. Liked Posts Tab -->
            @if (selectedTab() === 'likes') {
              @if (likesList().length === 0) {
                <div class="state state--sm">
                  <app-icon name="heart" />
                  <p>{{ i18n.t('profile.noLikes') }}</p>
                  <p class="state__hint">{{ i18n.t('profile.noLikesMessage') }}</p>
                  <a routerLink="/posts" class="btn btn--outline btn--sm" style="margin-block-start: 0.5rem">
                    <app-icon name="compass" />
                    {{ i18n.t('profile.exploreContent') }}
                  </a>
                </div>
              } @else {
                <div class="activity-grid">
                  @for (item of likesList(); track item.id) {
                    <div class="activity-card">
                      <div class="activity-card__thumb">
                        @if (item.coverImage) {
                          <img [src]="item.coverImage" [alt]="item.title" />
                        } @else {
                          <div class="activity-card__placeholder">
                            <app-icon [name]="item.itemType === 'video' ? 'video' : 'post'" />
                          </div>
                        }
                        <span class="activity-card__tag badge badge--gold">
                          {{ item.itemType === 'video' ? 'Video' : 'Article' }}
                        </span>
                      </div>
                      <div class="activity-card__body">
                        <h4 class="activity-card__title">{{ item.title }}</h4>
                        <div class="activity-card__actions">
                          <a [routerLink]="item.route" class="btn btn--sm btn--gold">
                            <app-icon [name]="item.itemType === 'video' ? 'play' : 'book'" />
                            {{ item.itemType === 'video' ? i18n.t('profile.watchVideo') : i18n.t('profile.readPost') }}
                          </a>
                          <button
                            type="button"
                            class="btn-icon-danger"
                            (click)="unlike(item)"
                            [attr.aria-label]="i18n.t('profile.unlike')"
                            [title]="i18n.t('profile.unlike')"
                          >
                            <app-icon name="trash" />
                          </button>
                        </div>
                      </div>
                    </div>
                  }
                </div>
              }
            }

            <!-- 3. My Comments Tab -->
            @if (selectedTab() === 'comments') {
              @if (commentsList().length === 0) {
                <div class="state state--sm">
                  <app-icon name="comment" />
                  <p>{{ i18n.t('profile.noComments') }}</p>
                  <p class="state__hint">{{ i18n.t('profile.noCommentsMessage') }}</p>
                  <a routerLink="/posts" class="btn btn--outline btn--sm" style="margin-block-start: 0.5rem">
                    <app-icon name="compass" />
                    {{ i18n.t('profile.exploreContent') }}
                  </a>
                </div>
              } @else {
                <div class="comments-list">
                  @for (c of commentsList(); track c.id) {
                    <div class="comment-item">
                      <div class="comment-item__header">
                        <span class="comment-item__target">
                          <app-icon name="post" />
                          {{ i18n.t('profile.commentOn') }}:
                          <a [routerLink]="c.route" [fragment]="'comments'" class="comment-item__link">
                            {{ c.itemTitle || c.itemId }}
                          </a>
                        </span>
                        <button
                          type="button"
                          class="btn-text-danger"
                          (click)="deleteComment(c)"
                        >
                          <app-icon name="trash" />
                          {{ i18n.t('profile.deleteComment') }}
                        </button>
                      </div>
                      <blockquote class="comment-item__content">
                        "{{ c.content }}"
                      </blockquote>
                      <div class="comment-item__meta">
                        <app-icon name="clock" />
                        <span>{{ c.date }}</span>
                      </div>
                    </div>
                  }
                </div>
              }
            }
          }
        </article>
      </div>
    </section>
  `,
  styleUrl: './profile.page.scss',
})
export class ProfilePage {
  readonly i18n = inject(I18nService);
  readonly auth = inject(AuthService);
  readonly session = inject(SessionService);
  private readonly toast = inject(ToastService);
  private readonly engagement = inject(EngagementService);
  private readonly postService = inject(PostService);
  private readonly videoService = inject(VideoService);
  private readonly confirm = inject(ConfirmService);

  readonly savingPhoto = signal(false);
  readonly loadingActivity = signal(true);
  readonly selectedTab = signal<ProfileTab>('bookmarks');

  readonly bookmarksList = signal<ActivityItem[]>([]);
  readonly likesList = signal<ActivityItem[]>([]);
  readonly commentsList = signal<
    Array<{
      id: string;
      itemId: string;
      itemType: 'post' | 'video';
      content: string;
      date: string;
      route: string;
      itemTitle?: string;
    }>
  >([]);

  constructor() {
    this.loadUserEngagement();
  }

  loadUserEngagement(): void {
    const uid = this.auth.user()?.uid;
    if (!uid) {
      this.loadingActivity.set(false);
      return;
    }

    this.loadingActivity.set(true);

    // 1. Fetch Bookmarks
    this.engagement.allBookmarkDocs(uid).pipe(
      switchMap((bookmarks) => {
        if (!bookmarks.length) return of([]);
        const postIds = bookmarks.filter((b) => b.itemType === 'post').map((b) => b.itemId);
        const videoIds = bookmarks.filter((b) => b.itemType === 'video').map((b) => b.itemId);

        return forkJoin({
          posts: postIds.length ? this.postService.byIds(postIds) : of([]),
          videos: videoIds.length ? this.videoService.byIds(videoIds) : of([]),
        }).pipe(
          switchMap(({ posts, videos }) => {
            const items: ActivityItem[] = bookmarks.map((b) => {
              if (b.itemType === 'post') {
                const p = posts.find((item) => item.id === b.itemId);
                return {
                  id: b.id,
                  itemId: b.itemId,
                  itemType: 'post',
                  title: this.resolveTitle(p?.title) || b.itemId,
                  coverImage: p?.coverImage || undefined,
                  route: `/posts/${p?.slug || b.itemId}`,
                  createdAt: b.createdAt,
                };
              } else {
                const v = videos.find((item) => item.id === b.itemId);
                return {
                  id: b.id,
                  itemId: b.itemId,
                  itemType: 'video',
                  title: this.resolveTitle(v?.title) || b.itemId,
                  coverImage: v?.thumbnailUrl || undefined,
                  route: `/videos/${v?.id || b.itemId}`,
                  createdAt: b.createdAt,
                };
              }
            });
            return of(items);
          }),
        );
      }),
    ).subscribe({
      next: (items) => this.bookmarksList.set(items),
      error: (e) => console.error('Error loading bookmarks', e),
    });

    // 2. Fetch Likes
    this.engagement.allLikedDocs(uid).pipe(
      switchMap((likes) => {
        if (!likes.length) return of([]);
        const postIds = likes.filter((l) => l.itemType === 'post').map((l) => l.itemId);
        const videoIds = likes.filter((l) => l.itemType === 'video').map((l) => l.itemId);

        return forkJoin({
          posts: postIds.length ? this.postService.byIds(postIds) : of([]),
          videos: videoIds.length ? this.videoService.byIds(videoIds) : of([]),
        }).pipe(
          switchMap(({ posts, videos }) => {
            const items: ActivityItem[] = likes.map((l) => {
              if (l.itemType === 'post') {
                const p = posts.find((item) => item.id === l.itemId);
                return {
                  id: l.id,
                  itemId: l.itemId,
                  itemType: 'post',
                  title: this.resolveTitle(p?.title) || l.itemId,
                  coverImage: p?.coverImage || undefined,
                  route: `/posts/${p?.slug || l.itemId}`,
                  createdAt: l.createdAt,
                };
              } else {
                const v = videos.find((item) => item.id === l.itemId);
                return {
                  id: l.id,
                  itemId: l.itemId,
                  itemType: 'video',
                  title: this.resolveTitle(v?.title) || l.itemId,
                  coverImage: v?.thumbnailUrl || undefined,
                  route: `/videos/${v?.id || l.itemId}`,
                  createdAt: l.createdAt,
                };
              }
            });
            return of(items);
          }),
        );
      }),
    ).subscribe({
      next: (items) => this.likesList.set(items),
      error: (e) => console.error('Error loading likes', e),
    });

    // 3. Fetch Comments
    this.engagement.listByUser(uid).pipe(
      switchMap((comments) => {
        if (!comments.length) return of([]);
        const postIds = comments.filter((c) => c.itemType === 'post').map((c) => c.itemId);
        const videoIds = comments.filter((c) => c.itemType === 'video').map((c) => c.itemId);

        return forkJoin({
          posts: postIds.length ? this.postService.byIds(postIds) : of([]),
          videos: videoIds.length ? this.videoService.byIds(videoIds) : of([]),
        }).pipe(
          switchMap(({ posts, videos }) => {
            const list = comments.map((c) => {
              let title = c.itemId;
              let route = '';
              if (c.itemType === 'post') {
                const p = posts.find((item) => item.id === c.itemId);
                if (p) title = this.resolveTitle(p.title);
                route = `/posts/${p?.slug || c.itemId}`;
              } else {
                const v = videos.find((item) => item.id === c.itemId);
                if (v) title = this.resolveTitle(v.title);
                route = `/videos/${v?.id || c.itemId}`;
              }

              const date = c.createdAt
                ? new Intl.DateTimeFormat(this.i18n.localeOf(), {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  }).format(c.createdAt.toDate ? c.createdAt.toDate() : new Date())
                : '';

              return {
                id: c.id,
                itemId: c.itemId,
                itemType: c.itemType,
                content: c.content,
                date,
                route,
                itemTitle: title,
              };
            });
            return of(list);
          }),
        );
      }),
    ).subscribe({
      next: (list) => {
        this.commentsList.set(list);
        this.loadingActivity.set(false);
      },
      error: (e) => {
        console.error('Error loading comments', e);
        this.loadingActivity.set(false);
      },
    });
  }

  async removeBookmark(item: ActivityItem): Promise<void> {
    const uid = this.auth.user()?.uid;
    if (!uid) return;
    await this.engagement.toggleBookmark(uid, item.itemType as any, item.itemId);
    this.bookmarksList.set(this.bookmarksList().filter((b) => b.id !== item.id));
    this.toast.success(this.i18n.t('toast.bookmarkRemoved'));
  }

  async unlike(item: ActivityItem): Promise<void> {
    const uid = this.auth.user()?.uid;
    if (!uid) return;
    await this.engagement.toggleLike(uid, item.itemType as any, item.itemId);
    this.likesList.set(this.likesList().filter((l) => l.id !== item.id));
    this.toast.success(this.i18n.t('toast.likeRemoved'));
  }

  async deleteComment(comment: { id: string; itemType: 'post' | 'video'; itemId: string }): Promise<void> {
    const ok = await this.confirm.confirm({
      title: this.i18n.t('profile.deleteCommentConfirm'),
      confirmLabel: this.i18n.t('profile.deleteComment'),
      danger: true,
    });
    if (!ok) return;

    const uid = this.auth.user()?.uid;
    await this.engagement.removeComment(comment.id, comment.itemType, comment.itemId, uid);
    this.commentsList.set(this.commentsList().filter((c) => c.id !== comment.id));
    this.toast.success(this.i18n.t('profile.commentDeleted'));
  }

  private resolveTitle(title: any): string {
    if (!title) return '';
    if (typeof title === 'string') return title;
    const lang = this.i18n.language();
    return title[lang] || title['ur'] || title['en'] || title['ar'] || '';
  }

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (files && files.length > 0) {
      void this.processAndUploadPhoto(files[0]);
    }
    input.value = '';
  }

  async removePhoto(): Promise<void> {
    this.savingPhoto.set(true);
    try {
      await this.auth.updateOwnProfile({ photoURL: '' });
      this.toast.success(this.i18n.t('profile.photoRemoved'));
    } catch {
      this.toast.error(this.i18n.t('common.errorMessage'));
    } finally {
      this.savingPhoto.set(false);
    }
  }

  private async processAndUploadPhoto(file: File): Promise<void> {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type) || file.size > 2 * 1024 * 1024) {
      this.toast.error(this.i18n.t('profile.invalidPhoto'));
      return;
    }

    this.savingPhoto.set(true);

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const img = new Image();
      img.onload = async () => {
        try {
          const size = 320;
          const canvas = document.createElement('canvas');
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error('Canvas not supported');

          const minDim = Math.min(img.naturalWidth, img.naturalHeight);
          const startX = (img.naturalWidth - minDim) / 2;
          const startY = (img.naturalHeight - minDim) / 2;

          ctx.drawImage(img, startX, startY, minDim, minDim, 0, 0, size, size);
          const squareDataUrl = canvas.toDataURL('image/jpeg', 0.88);

          await this.auth.updateOwnProfile({ photoURL: squareDataUrl });
          this.toast.success(this.i18n.t('profile.photoUpdated'));
        } catch {
          this.toast.error(this.i18n.t('common.errorMessage'));
        } finally {
          this.savingPhoto.set(false);
        }
      };
      img.onerror = () => {
        this.toast.error(this.i18n.t('profile.invalidPhoto'));
        this.savingPhoto.set(false);
      };
      img.src = result;
    };
    reader.onerror = () => {
      this.toast.error(this.i18n.t('profile.invalidPhoto'));
      this.savingPhoto.set(false);
    };
    reader.readAsDataURL(file);
  }

  readonly roleLabel = computed(() =>
    this.auth.isAdmin() ? this.i18n.t('profile.role.admin') : this.i18n.t('profile.role.user'),
  );

  readonly memberSince = computed(() => {
    const created = this.auth.profile()?.createdAt;
    if (!created) return null;
    return new Intl.DateTimeFormat(this.i18n.localeOf(), {
      dateStyle: 'medium',
    }).format(created.toDate());
  });
}
