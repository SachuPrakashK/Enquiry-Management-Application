import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal, viewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink, RouterOutlet } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { AdminUser } from '../../shared/models';
import { PageHeader } from '../../shared/page-header';
import { Badge } from '../../shared/badge';
import { EmptyState } from '../../shared/empty-state';
import { ConfirmDialog } from '../../shared/confirm-dialog';
import { UserStore } from './user.store';
import { SvgIcon } from '../../shared/svg-icon';
import { ActionMenu } from '../../shared/action-menu';
import { Pagination } from '../../shared/pagination';
import { AuthService } from '../../core/auth.service';
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-user-list',
  imports: [
    DatePipe,
    RouterLink,
    ReactiveFormsModule,
    PageHeader,
    Badge,
    EmptyState,
    ConfirmDialog,
    SvgIcon,
    ActionMenu,
    Pagination,
    RouterOutlet,
  ],
  templateUrl: './user-list.html',
})
export class UserList {
  readonly store = inject(UserStore);
  readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  readonly search = new FormControl('', { nonNullable: true });
  readonly query = signal('');
  readonly filtersVisible = signal(false);
  readonly roleFilter = new FormControl('', { nonNullable: true });
  readonly statusFilter = new FormControl('', { nonNullable: true });
  readonly appliedRole = signal('');
  readonly appliedStatus = signal('');
  readonly page = signal(1);
  readonly size = signal(10);
  readonly deleting = signal<AdminUser | null>(null);
  readonly changingStatus = signal<AdminUser | null>(null);
  readonly confirm = viewChild.required(ConfirmDialog);
  readonly statusConfirm = viewChild.required<ConfirmDialog>('statusConfirm');
  readonly activeFilterCount = computed(
    () => Number(Boolean(this.appliedRole())) + Number(Boolean(this.appliedStatus())),
  );
  readonly filtered = computed(() =>
    this.store
      .items()
      .filter(
        (user) =>
          `${user.firstName} ${user.lastName} ${user.email} ${user.username}`
            .toLowerCase()
            .includes(this.query()) &&
          (!this.appliedRole() || user.role === this.appliedRole()) &&
          (!this.appliedStatus() || String(user.isActive) === this.appliedStatus()),
      ),
  );
  readonly currentPage = computed(() =>
    Math.min(this.page(), Math.max(1, Math.ceil(this.filtered().length / this.size()))),
  );
  readonly visible = computed(() =>
    this.filtered().slice((this.currentPage() - 1) * this.size(), this.currentPage() * this.size()),
  );
  constructor() {
    this.load();
    this.search.valueChanges
      .pipe(debounceTime(250), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((value) => {
        this.query.set(value.toLowerCase().trim());
        this.page.set(1);
      });
  }
  load() {
    this.store.load().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
  }
  askToggle(user: AdminUser) {
    this.store.error.set('');
    this.changingStatus.set(user);
    this.statusConfirm().open();
  }
  toggle() {
    const user = this.changingStatus();
    if (!user || this.store.saving()) return;
    this.store
      .toggle(user)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.statusConfirm().close());
  }
  askDelete(user: AdminUser) {
    this.store.error.set('');
    this.deleting.set(user);
    this.confirm().open();
  }
  delete() {
    const user = this.deleting();
    if (user)
      this.store
        .delete(user.id)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => this.confirm().close());
  }
  applyFilters() {
    this.appliedRole.set(this.roleFilter.value);
    this.appliedStatus.set(this.statusFilter.value);
    this.page.set(1);
  }
  clearFilters() {
    this.roleFilter.setValue('');
    this.statusFilter.setValue('');
    this.applyFilters();
  }
  resize(size: number) {
    this.size.set(size);
    this.page.set(1);
  }
}
