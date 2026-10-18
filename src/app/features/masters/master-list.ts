import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal, viewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { MasterStore } from './master.store';
import { EnquiryStatus, Master, MasterKind } from '../../shared/models';
import { Badge } from '../../shared/badge';
import { PageHeader } from '../../shared/page-header';
import { EmptyState } from '../../shared/empty-state';
import { ConfirmDialog } from '../../shared/confirm-dialog';
import { SvgIcon } from '../../shared/svg-icon';
import { ActionMenu } from '../../shared/action-menu';
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-master-list',
  providers: [MasterStore],
  imports: [
    RouterLink,
    ReactiveFormsModule,
    DatePipe,
    Badge,
    PageHeader,
    EmptyState,
    ConfirmDialog,
    SvgIcon,
    ActionMenu,
  ],
  templateUrl: './master-list.html',
})
export class MasterList {
  readonly store = inject(MasterStore);
  private readonly destroyRef = inject(DestroyRef);
  readonly kind = inject(ActivatedRoute).snapshot.data['kind'] as MasterKind;
  readonly title = this.kind === 'statuses' ? 'Enquiry Status' : 'Enquiry Categories';
  readonly singular = this.kind === 'statuses' ? 'status' : 'category';
  readonly description =
    this.kind === 'statuses'
      ? 'Organize the stages of your customer enquiry workflow.'
      : 'Manage the services your customers are interested in.';
  readonly search = new FormControl('', { nonNullable: true });
  readonly query = signal('');
  readonly deleting = signal<Master | null>(null);
  readonly dialog = viewChild.required(ConfirmDialog);
  readonly filtered = computed(() =>
    this.store
      .items()
      .filter((item) => `${item.name} ${item.code}`.toLowerCase().includes(this.query())),
  );
  constructor() {
    this.load();
    this.search.valueChanges
      .pipe(debounceTime(250), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((value) => this.query.set(value.toLowerCase().trim()));
  }
  load() {
    this.store.load(this.kind).pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
  }
  asStatus(item: Master): EnquiryStatus | undefined {
    return 'color' in item ? item : undefined;
  }
  toggle(item: Master) {
    if (!this.store.saving())
      this.store.toggle(this.kind, item).pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
  }
  askDelete(item: Master) {
    this.store.error.set('');
    this.deleting.set(item);
    this.dialog().open();
  }
  delete() {
    const item = this.deleting();
    if (!item || this.store.saving()) return;
    this.store
      .delete(this.kind, item.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.dialog().close());
  }
}
