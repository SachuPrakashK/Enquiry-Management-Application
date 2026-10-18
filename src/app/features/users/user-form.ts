import { ButtonLoader } from '../../shared/button-loader';
import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AdminRole } from '../../shared/models';
import { FieldError } from '../../shared/field-error';
import { UserStore } from './user.store';
import { SideDrawer } from '../../shared/side-drawer';
import { matchingPasswords, strongPassword } from '../auth/password-validator';
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-user-form',
  imports: [ButtonLoader, RouterLink, ReactiveFormsModule, FieldError, SideDrawer],
  templateUrl: './user-form.html',
})
export class UserForm {
  readonly store = inject(UserStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  readonly id = this.route.snapshot.paramMap.get('id');
  readonly roles: AdminRole[] = ['Super Admin', 'Admin'];
  readonly form = inject(NonNullableFormBuilder).group(
    {
      firstName: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(80)]],
      lastName: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(80)]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
      username: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(80)]],
      role: ['Admin' as AdminRole, Validators.required],
      password: ['', this.id ? [] : [Validators.required, strongPassword]],
      confirmPassword: ['', this.id ? [] : Validators.required],
      isActive: [true],
    },
    { validators: matchingPasswords },
  );
  constructor() {
    if (this.id)
      this.store
        .load(this.id)
        .pipe(takeUntilDestroyed())
        .subscribe(() => {
          const user = this.store.selectedItem();
          if (user) this.form.patchValue(user);
        });
  }
  close() {
    void this.router.navigateByUrl('/admin/users');
  }
  submit() {
    if (this.store.saving()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { confirmPassword, password, ...value } = this.form.getRawValue();
    void confirmPassword;
    this.store
      .save(
        {
          ...value,
          firstName: value.firstName.trim(),
          lastName: value.lastName.trim(),
          email: value.email.trim().toLowerCase(),
          username: value.username.trim(),
          ...(this.id ? {} : { password }),
        },
        this.id || undefined,
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => void this.router.navigate(['/admin/users']));
  }
}
