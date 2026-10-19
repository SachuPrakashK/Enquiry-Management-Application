import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PageHeader } from '../../shared/page-header';
import { Badge } from '../../shared/badge';
import { UserStore } from './user.store';
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-user-detail',
  providers: [UserStore],
  imports: [DatePipe, RouterLink, PageHeader, Badge],
  templateUrl: './user-detail.html',
})
export class UserDetail {
  readonly store = inject(UserStore);
  private readonly destroyRef = inject(DestroyRef);
  readonly id = inject(ActivatedRoute).snapshot.paramMap.get('id') || '';
  readonly parents = [{ label: 'Users', url: '/admin/users' }];
  constructor() {
    this.store.load(this.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
  }
}
