import { inject, Injectable, signal } from '@angular/core';
import { catchError, EMPTY, finalize, Observable, tap } from 'rxjs';
import { CategoryService, StatusService } from '../../core/api.service';
import { errorMessage, shouldShowErrorToast } from '../../core/http-error';
import { ToastService } from '../../core/toast.service';
import { Category, CreateDto, EnquiryStatus, Master, MasterKind } from '../../shared/models';
@Injectable()
export class MasterStore {
  private readonly statuses = inject(StatusService);
  private readonly categories = inject(CategoryService);
  private readonly toasts = inject(ToastService);
  readonly items = signal<Master[]>([]);
  readonly selectedItem = signal<Master | null>(null);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');
  load(kind: MasterKind, id?: string) {
    this.loading.set(true);
    this.error.set('');
    const request: Observable<Master | Master[]> = id
      ? kind === 'statuses'
        ? this.statuses.get(id)
        : this.categories.get(id)
      : kind === 'statuses'
        ? this.statuses.list()
        : this.categories.list();
    return request.pipe(
      tap((value) => (Array.isArray(value) ? this.items.set(value) : this.selectedItem.set(value))),
      catchError((error) => {
        this.error.set(errorMessage(error));
        return EMPTY;
      }),
      finalize(() => this.loading.set(false)),
    );
  }
  save(kind: MasterKind, value: CreateDto<EnquiryStatus>, id?: string) {
    const { color, ...category } = value;
    const request: Observable<Master> =
      kind === 'statuses'
        ? id
          ? this.statuses.update(id, value)
          : this.statuses.create(value)
        : id
          ? this.categories.update(id, category)
          : this.categories.create(category);
    const label = kind === 'statuses' ? 'Status' : 'Category';
    return this.mutate(request, `${label} ${id ? 'updated' : 'created'} successfully.`);
  }
  toggle(kind: MasterKind, record: Master) {
    const request: Observable<Category> =
      kind === 'statuses'
        ? this.statuses.update(record.id, { isActive: !record.isActive })
        : this.categories.update(record.id, { isActive: !record.isActive });
    return this.mutate(request, 'Active state updated successfully.').pipe(
      tap((updated) =>
        this.items.update((items) =>
          items.map((item) => (item.id === updated.id ? updated : item)),
        ),
      ),
    );
  }
  delete(kind: MasterKind, id: string) {
    return this.mutate(
      kind === 'statuses' ? this.statuses.delete(id) : this.categories.delete(id),
      `${kind === 'statuses' ? 'Status' : 'Category'} deleted successfully.`,
    ).pipe(tap(() => this.items.update((items) => items.filter((item) => item.id !== id))));
  }
  private mutate<T>(request: Observable<T>, message: string) {
    if (this.saving()) return EMPTY;
    this.saving.set(true);
    this.error.set('');
    return request.pipe(
      tap(() => this.toasts.success(message)),
      catchError((error) => {
        const message = errorMessage(error);
        if (shouldShowErrorToast(error)) this.toasts.error(message);
        return EMPTY;
      }),
      finalize(() => this.saving.set(false)),
    );
  }
}
