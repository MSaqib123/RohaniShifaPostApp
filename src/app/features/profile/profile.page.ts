import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { SessionService } from '../../core/auth/session.service';
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
            <span class="avatar avatar--lg">{{ auth.initials() }}</span>
            <div>
              <h2>{{ auth.displayName() }}</h2>
              <p class="profile__email">{{ auth.user()?.email }}</p>
              <span class="badge badge--gold">{{ roleLabel() }}</span>
            </div>
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
