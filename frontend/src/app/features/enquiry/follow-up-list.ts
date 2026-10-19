import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { EnquiryStore } from './enquiry.store';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PageHeader } from '../../shared/page-header';
import { Badge } from '../../shared/badge';
import { EmptyState } from '../../shared/empty-state';
import { FollowUpDialog } from './follow-up-dialog';
import { localDate } from '../../shared/date-utils';
import { SvgIcon } from '../../shared/svg-icon';
import { ActionMenu } from '../../shared/action-menu';
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-follow-up-list',
  providers: [EnquiryStore],
  imports: [DatePipe, RouterLink, PageHeader, Badge, EmptyState, FollowUpDialog, SvgIcon, ActionMenu],
  templateUrl: './follow-up-list.html',
})
export class FollowUpList {
  readonly store = inject(EnquiryStore);
  private readonly destroyRef = inject(DestroyRef);
  readonly tabs = ['Today', 'Upcoming', 'Overdue', 'Completed'];
  readonly selected = signal('Today');
  readonly today = localDate();
  readonly groups = computed(() => {
    const historyIds = new Set(this.store.followUps().map((item) => item.enquiryId));
    const items = [...this.store.items()].sort((a, b) =>
      a.nextFollowUpDate.localeCompare(b.nextFollowUpDate),
    );
    return new Map([
      ['Today', items.filter((item) => item.nextFollowUpDate === this.today)],
      ['Upcoming', items.filter((item) => item.nextFollowUpDate > this.today)],
      [
        'Overdue',
        items.filter((item) => item.nextFollowUpDate && item.nextFollowUpDate < this.today),
      ],
      ['Completed', items.filter((item) => !item.nextFollowUpDate && historyIds.has(item.id))],
    ]);
  });
  readonly filtered = computed(() => this.groups().get(this.selected()) || []);
  constructor() {
    this.load();
  }
  count(tab: string) {
    return this.groups().get(tab)?.length || 0;
  }
  load() {
    this.store.load().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
  }
}
