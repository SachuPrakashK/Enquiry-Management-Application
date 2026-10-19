import { ButtonLoader } from '../../shared/button-loader';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../core/auth.service';
import { FieldError } from '../../shared/field-error';
import { SvgIcon } from '../../shared/svg-icon';
import { ToastService } from '../../core/toast.service';
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-login',
  imports: [ButtonLoader, ReactiveFormsModule, RouterLink, FieldError, SvgIcon],
  templateUrl: './login.html',
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  readonly error = signal('');
  readonly showPassword = signal(false);
  readonly submitting = signal(false);
  readonly form = inject(NonNullableFormBuilder).group({
    identifier: ['', Validators.required],
    password: ['', Validators.required],
    remember: [false],
  });
  constructor() {
    if (this.auth.authenticated()) void this.router.navigateByUrl('/admin/dashboard');
  }
  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    this.error.set('');
    this.submitting.set(true);
    this.auth.signIn(value.identifier.trim(), value.password, value.remember).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => { this.submitting.set(false); this.toast.success('Welcome back.'); void this.router.navigateByUrl('/admin/dashboard'); },
      error: () => { this.submitting.set(false); this.error.set('The email, username, or password is incorrect.'); },
    });
  }
}
