import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EnquiryStore } from './enquiry.store';
import { PageHeader } from '../../shared/page-header';
import { Badge } from '../../shared/badge';
import { EmptyState } from '../../shared/empty-state';
import { isValidDate, localDate } from '../../shared/date-utils';
import { IconName, SvgIcon } from '../../shared/svg-icon';
import { EmptyChartState } from '../../shared/empty-chart-state';
import { StatusDonutChart } from './status-donut-chart';
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-dashboard',
  providers: [EnquiryStore],
  imports: [
    DatePipe,
    RouterLink,
    PageHeader,
    Badge,
    EmptyState,
    SvgIcon,
    EmptyChartState,
    StatusDonutChart,
  ],
  templateUrl: './dashboard.html',
})
export class Dashboard {
  readonly store = inject(EnquiryStore);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  readonly today = localDate();
  readonly date = new Date();
  readonly isValidDate = isValidDate;
  readonly pending = computed(() =>
    this.store
      .items()
      .filter((item) => item.nextFollowUpDate)
      .sort((a, b) => a.nextFollowUpDate.localeCompare(b.nextFollowUpDate)),
  );
  readonly overdue = computed(
    () => this.pending().filter((item) => item.nextFollowUpDate < this.today).length,
  );
  readonly stats = computed(() => {
    const items = this.store.items();
    const count = (codes: string[]) =>
      items.filter((item) => codes.includes(this.store.statusMap().get(item.statusId)?.code || ''))
        .length;
    return [
      {
        label: 'Total Enquiries',
        value: items.length,
        icon: 'enquiry' as IconName,
        tone: 'blue',
        detail: 'All customer conversations',
      },
      {
        label: 'New Enquiries',
        value: count(['NEW']),
        icon: 'plus' as IconName,
        tone: 'teal',
        detail: 'Ready for a first response',
      },
      {
        label: 'In Progress',
        value: count(['IN_PROGRESS']),
        icon: 'follow-up' as IconName,
        tone: 'amber',
        detail: 'Conversations in motion',
      },
      {
        label: 'Completed / Closed',
        value: count(['CONVERTED', 'CLOSED']),
        icon: 'success' as IconName,
        tone: 'green',
        detail: 'Successfully wrapped up',
      },
      {
        label: 'Pending Follow-ups',
        value: this.pending().length,
        icon: 'calendar' as IconName,
        tone: 'violet',
        detail: `${this.overdue()} overdue · needs attention`,
      },
    ];
  });
  readonly recent = computed(() =>
    [...this.store.items()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5),
  );
  readonly upcoming = computed(() => this.pending().slice(0, 4));
  readonly statusChartData = computed(() =>
    this.store.statuses().flatMap((status) => {
      const count = this.store.items().filter((item) => item.statusId === status.id).length;
      return count ? [{ name: status.name, count, color: status.color }] : [];
    }),
  );
  constructor() {
    this.load();
  }
  load() {
    this.store.load().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
  }
  viewEnquiry(id: string) {
    void this.router.navigate(['/admin/enquiries', id]);
  }
}
