import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { SessionService } from '../../core/auth/session.service';
import { ToastService } from '../../core/services/toast.service';
import { I18nService } from '../../i18n/i18n.service';
import { LanguageSwitcher } from '../../i18n/language-switcher';
import { IconComponent } from '../../shared/components/icon/icon';

/**
 * Signed-in profile (§57): account facts, language preference and the
 * favorites area. Favorites read from real engagement collections — until
 * Phase 5 wires them up they render the honest empty state (§61).
 */
@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [IconComponent, LanguageSwitcher],
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
            {{ i18n.t('nav.logout') }}
          </button>
        </div>
      </header>

      <div class="profile__grid">
        <!-- Account -->
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

        <!-- Preferences -->
        <article class="card profile__card">
          <h2>{{ i18n.t('profile.languagePreference') }}</h2>
          <app-language-switcher />
        </article>

        <!-- Favorites -->
        <article class="card profile__card profile__card--wide">
          <h2>{{ i18n.t('profile.favorites') }}</h2>
          <div class="profile__favorites">
            @for (tab of favoriteTabs(); track tab.key) {
              <div class="profile__favorite">
                <h3>
                  <app-icon [name]="tab.icon" />
                  {{ i18n.t(tab.key) }}
                </h3>
                <div class="state state--sm">
                  <app-icon [name]="tab.icon" />
                  <p>{{ i18n.t(tab.emptyKey) }}</p>
                  <p class="state__hint">{{ i18n.t(tab.hintKey) }}</p>
                </div>
              </div>
            }
          </div>
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

  readonly savingPhoto = signal(false);

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
    if (!validTypes.includes(file.type)) {
      this.toast.error(this.i18n.t('profile.invalidPhoto'));
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
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

  /** Tab descriptors stay data-driven so labels never hard-code in markup. */
  readonly favoriteTabs = computed(() =>
    (
      [
        {
          key: 'profile.bookmarks',
          icon: 'bookmark',
          emptyKey: 'profile.noBookmarks',
          hintKey: 'profile.noBookmarksMessage',
        },
        {
          key: 'profile.likedPosts',
          icon: 'heart',
          emptyKey: 'profile.noLikes',
          hintKey: 'profile.noLikesMessage',
        },
        {
          key: 'profile.myComments',
          icon: 'comment',
          emptyKey: 'profile.noComments',
          hintKey: 'profile.noCommentsMessage',
        },
      ] as const
    ).map((tab) => ({ ...tab, icon: tab.icon as string })),
  );
}
