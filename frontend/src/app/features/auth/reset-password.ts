import { ButtonLoader } from '../../shared/button-loader';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../core/auth.service'; import { ToastService } from '../../core/toast.service'; import { matchingPasswords, strongPassword } from './password-validator';
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush, selector: 'app-reset-password', imports: [ButtonLoader, ReactiveFormsModule, RouterLink], templateUrl: './reset-password.html' })
export class ResetPassword { private readonly auth = inject(AuthService); private readonly toast = inject(ToastService); private readonly router = inject(Router); private readonly route = inject(ActivatedRoute); private readonly destroyRef = inject(DestroyRef); readonly saving = signal(false); readonly form = inject(NonNullableFormBuilder).group({ password: ['', [Validators.required, strongPassword]], confirmPassword: ['', Validators.required] }, { validators: matchingPasswords }); submit(): void { if (this.form.invalid) { this.form.markAllAsTouched(); return; } this.saving.set(true); this.auth.resetPassword(this.form.controls.password.value, this.route.snapshot.queryParamMap.get('token')).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: () => { this.saving.set(false); this.toast.success('Password reset completed.'); void this.router.navigateByUrl('/auth/sign-in'); }, error: () => this.saving.set(false) }); } }
