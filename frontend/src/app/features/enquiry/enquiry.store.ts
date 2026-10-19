import { computed, inject, Injectable, signal } from '@angular/core';
import { catchError, EMPTY, finalize, forkJoin, Observable, of, switchMap, tap } from 'rxjs';
import {
  CategoryService,
  FollowUpService,
  EnquiryService,
  StatusService,
} from '../../core/api.service';
import { ToastService } from '../../core/toast.service';
import { errorMessage, shouldShowErrorToast } from '../../core/http-error';
import {
  Category,
  CreateDto,
  FollowUp,
  Enquiry,
  EnquiryOptions,
  EnquiryStatus,
} from '../../shared/models';
@Injectable()
export class EnquiryStore {
  private readonly api = inject(EnquiryService);
  private readonly statusApi = inject(StatusService);
  private readonly categoryApi = inject(CategoryService);
  private readonly followUpApi = inject(FollowUpService);
  private readonly toasts = inject(ToastService);
  readonly items = signal<Enquiry[]>([]);
  readonly statuses = signal<EnquiryStatus[]>([]);
  readonly categories = signal<Category[]>([]);
  readonly followUps = signal<FollowUp[]>([]);
  readonly options = signal<EnquiryOptions>({
    priorities: [],
    sources: [],
    contactMethods: [],
    followUpTypes: [],
  });
  readonly selectedItem = signal<Enquiry | null>(null);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly activeStatuses = computed(() => this.statuses().filter((item) => item.isActive));
  readonly statusMap = computed(() => new Map(this.statuses().map((item) => [item.id, item])));
  readonly categoryMap = computed(() => new Map(this.categories().map((item) => [item.id, item])));
  readonly history = computed(() =>
    this.followUps()
      .filter((item) => item.enquiryId === this.selectedItem()?.id)
      .sort((a, b) =>
        `${b.followUpDate}${b.createdAt}`.localeCompare(`${a.followUpDate}${a.createdAt}`),
      ),
  );
  load(id?: string) {
    this.loading.set(true);
    this.error.set('');
    return forkJoin({
      items: this.api.list(),
      statuses: this.statusApi.list(),
      categories: this.categoryApi.list(),
      followUps: this.followUpApi.list(),
      options: this.api.options(),
      selected: id ? this.api.get(id) : of(null),
    }).pipe(
      tap((data) => {
        this.items.set(data.items);
        this.statuses.set(data.statuses);
        this.categories.set(data.categories);
        this.followUps.set(data.followUps);
        this.options.set(data.options);
        this.selectedItem.set(data.selected);
      }),
      catchError((error) => {
        this.error.set(errorMessage(error));
        return EMPTY;
      }),
      finalize(() => this.loading.set(false)),
    );
  }
  save(value: CreateDto<Enquiry>, id?: string) {
    return this.mutate(
      id ? this.api.update(id, value) : this.api.create(value),
      id ? 'Enquiry updated successfully.' : 'Enquiry created successfully.',
    ).pipe(tap((item) => this.upsert(item)));
  }
  changeStatus(id: string, statusId: string) {
    return this.mutate(
      this.api.update(id, { statusId }),
      'Enquiry status updated successfully.',
    ).pipe(tap((item) => this.upsert(item)));
  }
  delete(id: string) {
    return this.mutate(this.api.delete(id), 'Enquiry deleted successfully.').pipe(
      tap(() => {
        this.items.update((items) => items.filter((item) => item.id !== id));
        this.followUps.update((items) => items.filter((item) => item.enquiryId !== id));
      }),
    );
  }
  saveFollowUp(value: CreateDto<FollowUp>, id?: string) {
    return this.mutate(
      (id ? this.followUpApi.update(id, value) : this.followUpApi.create(value)).pipe(
        switchMap(() => this.reloadFollowUps(value.enquiryId)),
      ),
      id ? 'Follow-up updated successfully.' : 'Follow-up created successfully.',
    );
  }
  deleteFollowUp(item: FollowUp) {
    return this.mutate(
      this.followUpApi.delete(item.id).pipe(switchMap(() => this.reloadFollowUps(item.enquiryId))),
      'Follow-up deleted successfully.',
    );
  }
  private reloadFollowUps(enquiryId: string) {
    return forkJoin({ item: this.api.get(enquiryId), history: this.followUpApi.list() }).pipe(
      tap((data) => {
        this.upsert(data.item);
        this.followUps.set(data.history);
      }),
    );
  }
  private upsert(item: Enquiry) {
    this.items.update((items) =>
      items.some((record) => record.id === item.id)
        ? items.map((record) => (record.id === item.id ? item : record))
        : [item, ...items],
    );
    if (this.selectedItem()?.id === item.id) this.selectedItem.set(item);
  }
  private mutate<T>(request: Observable<T>, success: string) {
    if (this.saving()) return EMPTY;
    this.saving.set(true);
    this.error.set('');
    return request.pipe(
      tap(() => this.toasts.success(success)),
      catchError((error) => {
        const message = errorMessage(error);
        if (shouldShowErrorToast(error)) this.toasts.error(message);
        return EMPTY;
      }),
      finalize(() => this.saving.set(false)),
    );
  }
}
