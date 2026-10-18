import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { UserProfile } from '../../core/models';
import { AdminService } from '../../core/services/admin.service';
import { AuthService } from '../../core/auth/auth.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { ToastService } from '../../core/services/toast.service';
import { I18nService } from '../../i18n/i18n.service';
import { ContentStateComponent } from '../../shared/components/content-state';
import { IconComponent } from '../../shared/components/icon/icon';
import { AppDatePipe } from '../../shared/pipes/app-date.pipe';

/**
 * User directory + role display (§22, §26).
 *
 * Roles here only *mirror* the admin custom claim, which is granted from a
 * trusted context (see FIREBASE_SETUP.md) — this screen never grants itself
 * privileges, and nobody may change their own row.
 */
@Component({
  selector: 'app-admin-users-page',
  standalone: true,
  imports: [IconComponent, ContentStateComponent, AppDatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-users.page.html',
  styleUrl: './admin-users.page.scss',
})
export class AdminUsersPage {
  readonly i18n = inject(I18nService);
  private readonly adminService = inject(AdminService);
  private readonly auth = inject(AuthService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly error = signal(false);
  readonly users = signal<UserProfile[]>([]);
  readonly searchTerm = signal('');
  readonly savingId = signal<string | null>(null);

  readonly currentUid = computed(() => this.auth.user()?.uid ?? '');

  readonly filtered = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    if (!term) return this.users();
    return this.users().filter((user) =>
      `${user.displayName ?? ''} ${user.email ?? ''}`.toLowerCase().includes(term),
    );
  });

  constructor() {
    this.load();
  }

  nameOf(user: UserProfile): string {
    return user.displayName || user.email || user.uid;
  }

  isSelf(user: UserProfile): boolean {
    return user.uid === this.currentUid();
  }

  onSearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  retry(): void {
    this.load();
  }

  /** Flip a member between `user` and `admin` after an explicit confirmation. */
  async toggleRole(user: UserProfile): Promise<void> {
    if (this.isSelf(user)) return;
    const nextRole = user.role === 'admin' ? 'user' : 'admin';

    const confirmed = await this.confirm.confirm({
      title: this.i18n.t('admin.users.roleChangeTitle'),
      message: this.i18n.t('admin.users.roleChangeMessage'),
      confirmLabel: this.i18n.t(
        nextRole === 'admin' ? 'admin.users.makeAdmin' : 'admin.users.removeAdmin',
      ),
      danger: nextRole === 'user',
    });
    if (!confirmed) return;

    this.savingId.set(user.uid);
    try {
      await this.adminService.setProfileRole(user.uid, nextRole);
      this.users.update((items) =>
        items.map((item) => (item.uid === user.uid ? { ...item, role: nextRole } : item)),
      );
      this.toast.success(this.i18n.t('admin.users.roleUpdated'));
    } catch {
      this.toast.error(this.i18n.t('common.errorMessage'));
    } finally {
      this.savingId.set(null);
    }
  }

  private load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.adminService.listUsers().subscribe({
      next: (users) => {
        this.users.set(users);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }
}
