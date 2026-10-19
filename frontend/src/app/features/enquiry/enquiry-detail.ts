import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal, viewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EnquiryStore } from './enquiry.store';
import { PageHeader } from '../../shared/page-header';
import { Badge } from '../../shared/badge';
import { StatusDialog } from './status-dialog';
import { FollowUpDialog } from './follow-up-dialog';
import { ConfirmDialog } from '../../shared/confirm-dialog';
import { FollowUp } from '../../shared/models';
import { SvgIcon } from '../../shared/svg-icon';
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-enquiry-detail',
  providers: [EnquiryStore],
  imports: [DatePipe, RouterLink, PageHeader, Badge, StatusDialog, FollowUpDialog, ConfirmDialog, SvgIcon],
  templateUrl: './enquiry-detail.html',
})
export class EnquiryDetail {
  readonly store = inject(EnquiryStore);
  private readonly destroyRef = inject(DestroyRef);
  readonly id = inject(ActivatedRoute).snapshot.paramMap.get('id') || '';
  readonly parents = [{ label: 'Enquiries', url: '/admin/enquiries' }];
  readonly deleting = signal<FollowUp | null>(null);
  readonly confirm = viewChild.required(ConfirmDialog);
  constructor() {
    this.load();
  }
  load() {
    this.store.load(this.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
  }
  askDelete(item: FollowUp) {
    this.store.error.set('');
    this.deleting.set(item);
    this.confirm().open();
  }
  deleteFollowUp() {
    const item = this.deleting();
    if (!item || this.store.saving()) return;
    this.store
      .deleteFollowUp(item)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.confirm().close());
  }
}
