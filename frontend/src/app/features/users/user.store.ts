import { inject, Injectable, signal } from '@angular/core';
import { catchError, EMPTY, finalize, Observable, tap } from 'rxjs';
import { AdminUserService } from '../../core/api.service';
import { errorMessage, shouldShowErrorToast } from '../../core/http-error';
import { ToastService } from '../../core/toast.service';
import { AdminUser, CreateDto } from '../../shared/models';
import { AuthService } from '../../core/auth.service';
@Injectable()
export class UserStore {
  private readonly api = inject(AdminUserService);
  private readonly toasts = inject(ToastService);
  private readonly auth = inject(AuthService);
  readonly items = signal<AdminUser[]>([]);
  readonly selectedItem = signal<AdminUser | null>(null);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');
  load(): Observable<AdminUser[]>;
  load(id: string): Observable<AdminUser>;
  load(id?: string): Observable<AdminUser | AdminUser[]> {
    this.loading.set(true);
    this.error.set('');
    const request: Observable<AdminUser | AdminUser[]> = id ? this.api.get(id) : this.api.list();
    return request.pipe(
      tap((value) => (Array.isArray(value) ? this.items.set(value) : this.selectedItem.set(value))),
      catchError((error) => {
        this.error.set(errorMessage(error));
        return EMPTY;
      }),
      finalize(() => this.loading.set(false)),
    );
  }
  save(value: CreateDto<AdminUser> & { password?: string }, id?: string) {
    return this.mutate(
      id ? this.api.update(id, value) : this.api.create(value),
      id ? 'User updated successfully.' : 'User created successfully.',
    ).pipe(tap((user) => this.upsert(user)));
  }
  updatePhoto(id: string, profileImage: string) {
    return this.mutate(
      this.api.update(id, { profileImage }),
      'Profile photo updated successfully.',
    ).pipe(tap((user) => this.upsert(user)));
  }
  removePhoto(id: string) {
    return this.mutate(
      this.api.update(id, { profileImage: '' }),
      'Profile image removed successfully.',
    ).pipe(tap((user) => this.upsert(user)));
  }
  toggle(user: AdminUser) {
    return this.mutate(
      this.api.update(user.id, { isActive: !user.isActive }),
      'User access updated.',
    ).pipe(tap((user) => this.upsert(user)));
  }
  delete(id: string) {
    return this.mutate(this.api.delete(id), 'User deleted successfully.').pipe(
      tap(() => this.items.update((items) => items.filter((item) => item.id !== id))),
    );
  }
  private upsert(user: AdminUser) {
    this.items.update((items) =>
      items.some((item) => item.id === user.id)
        ? items.map((item) => (item.id === user.id ? user : item))
        : [user, ...items],
    );
    this.selectedItem.set(user);
    this.auth.updateCurrentUser(user);
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
