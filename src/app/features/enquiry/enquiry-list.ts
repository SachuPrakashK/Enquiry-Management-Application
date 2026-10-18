import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal, viewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { EnquiryStore } from './enquiry.store';
import { Enquiry, EnquiryFilters } from '../../shared/models';
import { localDate } from '../../shared/date-utils';
import { PageHeader } from '../../shared/page-header';
import { Badge } from '../../shared/badge';
import { Pagination } from '../../shared/pagination';
import { EmptyState } from '../../shared/empty-state';
import { ConfirmDialog } from '../../shared/confirm-dialog';
import { StatusDialog } from './status-dialog';
import { FollowUpDialog } from './follow-up-dialog';
import { emptyFilters, EnquiryFilterPanel } from './enquiry-filters';
import { SvgIcon } from '../../shared/svg-icon';
import { ActionMenu } from '../../shared/action-menu';
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-enquiry-list',
  imports: [
    RouterLink,
    ReactiveFormsModule,
    DatePipe,
    PageHeader,
    Badge,
    Pagination,
    EmptyState,
    ConfirmDialog,
    StatusDialog,
    FollowUpDialog,
    EnquiryFilterPanel,
    SvgIcon,
    ActionMenu,
    RouterOutlet,
  ],
  templateUrl: './enquiry-list.html',
})
export class EnquiryList {
  readonly store = inject(EnquiryStore);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  readonly search = new FormControl('', { nonNullable: true });
  readonly sort = new FormControl('newest', { nonNullable: true });
  readonly query = signal('');
  readonly filters = signal<EnquiryFilters>({ ...emptyFilters });
  readonly filtersVisible = signal(false);
  readonly activeFilterCount = computed(() => Object.values(this.filters()).filter(Boolean).length);
  readonly order = signal('newest');
  readonly page = signal(1);
  readonly size = signal(10);
  readonly deleting = signal<Enquiry | null>(null);
  readonly confirm = viewChild.required(ConfirmDialog);
  readonly filtered = computed(() => {
    const search = this.query();
    const filter = this.filters();
    const rows = this.store.items().filter((item) => {
      const created = localDate(new Date(item.createdAt));
      return (
        `${item.referenceNumber} ${item.customerName} ${item.email} ${item.phone} ${item.subject}`
          .toLowerCase()
          .includes(search) &&
        (!filter.statusId || item.statusId === filter.statusId) &&
        (!filter.categoryId || item.categoryId === filter.categoryId) &&
        (!filter.priority || item.priority === filter.priority) &&
        (!filter.source || item.source === filter.source) &&
        (!filter.from || created >= filter.from) &&
        (!filter.to || created <= filter.to) &&
        (!filter.followUp || item.nextFollowUpDate === filter.followUp) &&
        (!filter.customer || item.customerName.toLowerCase().includes(filter.customer))
      );
    });
    return rows.sort((a, b) => {
      switch (this.order()) {
        case 'oldest':
          return a.createdAt.localeCompare(b.createdAt);
        case 'customer':
          return a.customerName.localeCompare(b.customerName);
        case 'priority':
          return (
            this.store.options().priorities.indexOf(b.priority) -
            this.store.options().priorities.indexOf(a.priority)
          );
        case 'followUp':
          return (a.nextFollowUpDate || '9999').localeCompare(b.nextFollowUpDate || '9999');
        default:
          return b.createdAt.localeCompare(a.createdAt);
      }
    });
  });
  readonly currentPage = computed(() =>
    Math.min(this.page(), Math.max(1, Math.ceil(this.filtered().length / this.size()))),
  );
  readonly visible = computed(() =>
    this.filtered().slice((this.currentPage() - 1) * this.size(), this.currentPage() * this.size()),
  );
  constructor() {
    this.load();
    this.search.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((value) => {
        this.query.set(value.toLowerCase().trim());
        this.page.set(1);
      });
    this.sort.valueChanges.pipe(takeUntilDestroyed()).subscribe((value) => {
      this.order.set(value);
      this.page.set(1);
    });
  }
  load() {
    this.store.load().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
  }
  resize(size: number) {
    this.size.set(size);
    this.page.set(1);
  }
  viewEnquiry(id: string) {
    void this.router.navigate(['/admin/enquiries', id]);
  }
  apply(filters: EnquiryFilters) {
    this.filters.set(filters);
    this.page.set(1);
  }
  askDelete(item: Enquiry) {
    this.store.error.set('');
    this.deleting.set(item);
    this.confirm().open();
  }
  delete() {
    const item = this.deleting();
    if (!item || this.store.saving()) return;
    this.store
      .delete(item.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.confirm().close());
  }
}
