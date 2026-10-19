import { ButtonLoader } from '../../shared/button-loader';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../core/auth.service';
import { ToastService } from '../../core/toast.service';
import { FieldError } from '../../shared/field-error';
import { matchingPasswords, strongPassword } from './password-validator';
import { SvgIcon } from '../../shared/svg-icon';
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush, selector: 'app-register', imports: [ButtonLoader, ReactiveFormsModule, RouterLink, FieldError, SvgIcon], templateUrl: './register.html' })
export class Register {
  private readonly auth = inject(AuthService); private readonly toast = inject(ToastService); private readonly router = inject(Router); private readonly destroyRef = inject(DestroyRef);
  readonly saving = signal(false); readonly error = signal('');
  readonly showPassword = signal(false); readonly showConfirmation = signal(false);
  readonly form = inject(NonNullableFormBuilder).group({ firstName: ['', Validators.required], lastName: ['', Validators.required], email: ['', [Validators.required, Validators.email]], username: ['', Validators.required], password: ['', [Validators.required, strongPassword]], confirmPassword: ['', Validators.required] }, { validators: matchingPasswords });
  submit(): void { if (this.form.invalid) { this.form.markAllAsTouched(); return; } const { confirmPassword, ...value } = this.form.getRawValue(); void confirmPassword; this.saving.set(true); this.error.set(''); this.auth.register(value).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: () => { this.saving.set(false); this.toast.success('Registration completed successfully. Please sign in.'); void this.router.navigateByUrl('/auth/sign-in'); }, error: (error: unknown) => { this.saving.set(false); const message = error instanceof Error && error.message === 'duplicate-email' ? 'An account with this email already exists.' : error instanceof Error && error.message === 'duplicate-username' ? 'This username is already in use.' : 'Unable to create your account. Please try again.'; this.error.set(message); this.toast.error(message); } }); }
}
