import { ButtonLoader } from '../../shared/button-loader';
import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MasterStore } from './master.store';
import { MasterKind } from '../../shared/models';
import { FieldError } from '../../shared/field-error';
import { SideDrawer } from '../../shared/side-drawer';
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-master-form',
  providers: [MasterStore],
  imports: [ButtonLoader, ReactiveFormsModule, RouterLink, FieldError, SideDrawer],
  templateUrl: './master-form.html',
})
export class MasterForm {
  readonly store = inject(MasterStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  readonly kind = this.route.snapshot.data['kind'] as MasterKind;
  readonly id = this.route.snapshot.paramMap.get('id');
  readonly singular = this.kind === 'statuses' ? 'status' : 'category';
  readonly backLink = '/admin/' + this.kind;
  readonly form = inject(NonNullableFormBuilder).group({
    name: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(100)]],
    code: ['', [Validators.required, Validators.pattern(/^[A-Z][A-Z0-9_]{1,39}$/)]],
    description: ['', Validators.maxLength(500)],
    color: ['#0f766e', Validators.pattern(/^#[0-9a-f]{6}$/i)],
    isActive: [true],
  });
  constructor() {
    if (this.id)
      this.store
        .load(this.kind, this.id)
        .pipe(takeUntilDestroyed())
        .subscribe(() => {
          const item = this.store.selectedItem();
          if (item) this.form.patchValue(item);
        });
  }
  close() {
    void this.router.navigateByUrl(this.backLink);
  }
  submit() {
    if (this.store.saving()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    this.store
      .save(
        this.kind,
        { ...value, name: value.name.trim(), description: value.description.trim() },
        this.id || undefined,
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => void this.router.navigate(['/admin', this.kind]));
  }
}
