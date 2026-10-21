import { ButtonLoader } from '../../shared/button-loader';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../core/auth.service';
import { FieldError } from '../../shared/field-error';
import { errorMessage } from '../../core/http-error';
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush, selector: 'app-forgot-password', imports: [ButtonLoader, ReactiveFormsModule, RouterLink, FieldError], templateUrl: './forgot-password.html' })
export class ForgotPassword { private readonly auth = inject(AuthService); private readonly destroyRef = inject(DestroyRef); readonly sent = signal(false); readonly saving = signal(false); readonly error = signal(''); readonly form = inject(NonNullableFormBuilder).group({ email: ['', [Validators.required, Validators.email]] }); submit(): void { if (this.form.invalid) { this.form.markAllAsTouched(); return; } this.saving.set(true); this.error.set(''); this.auth.forgotPassword(this.form.controls.email.value).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: () => { this.saving.set(false); this.sent.set(true); }, error: (error: unknown) => { this.saving.set(false); this.error.set(errorMessage(error)); } }); } }
