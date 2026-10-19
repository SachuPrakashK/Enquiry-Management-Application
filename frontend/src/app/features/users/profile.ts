import { ButtonLoader } from '../../shared/button-loader';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../core/auth.service';
import { PageHeader } from '../../shared/page-header';
import { FieldError } from '../../shared/field-error';
import { UserStore } from './user.store';
import { SvgIcon } from '../../shared/svg-icon';
import { ConfirmDialog } from '../../shared/confirm-dialog';
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-profile',
  providers: [UserStore],
  imports: [ButtonLoader, ReactiveFormsModule, PageHeader, FieldError, SvgIcon, ConfirmDialog],
  templateUrl: './profile.html',
})
export class Profile {
  readonly store = inject(UserStore);
  readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly photoInput = viewChild<ElementRef<HTMLInputElement>>('photoInput');
  private readonly photoDeleteDialog = viewChild.required<ConfirmDialog>('photoDeleteDialog');
  readonly photoPreview = signal<string | null>(null);
  readonly photoError = signal('');
  readonly form = inject(NonNullableFormBuilder).group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    username: ['', Validators.required],
  });
  constructor() {
    effect(() => {
      const user = this.auth.currentUser();
      if (user) this.form.patchValue(user, { emitEvent: false });
    });
  }
  submit() {
    const user = this.auth.currentUser();
    if (!user || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.store
      .save({ ...this.form.getRawValue(), role: user.role, isActive: user.isActive }, user.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((updatedUser) => this.auth.updateCurrentUser(updatedUser));
  }

  selectPhoto(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    this.photoError.set('');
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      this.photoError.set('Please select a JPEG, PNG, or WebP image.');
      this.resetPhotoInput();
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.photoError.set('Profile image must not exceed 5 MB.');
      this.resetPhotoInput();
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') this.photoPreview.set(reader.result);
    };
    reader.onerror = () => this.photoError.set('Unable to preview this image.');
    reader.readAsDataURL(file);
  }

  savePhoto(): void {
    const user = this.auth.currentUser();
    const profileImage = this.photoPreview();
    if (!user || !profileImage || this.store.saving()) return;
    this.store
      .updatePhoto(user.id, profileImage)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((updatedUser) => {
        this.auth.updateCurrentUser(updatedUser);
        this.cancelPhoto();
      });
  }

  deletePhoto(): void {
    const user = this.auth.currentUser();
    if (!user?.profileImage || this.store.saving()) return;
    this.store
      .removePhoto(user.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((updatedUser) => {
        this.auth.updateCurrentUser(updatedUser);
        this.cancelPhoto();
        this.photoDeleteDialog().close();
      });
  }

  cancelPhoto(): void {
    this.photoPreview.set(null);
    this.photoError.set('');
    this.resetPhotoInput();
  }

  private resetPhotoInput(): void {
    const input = this.photoInput()?.nativeElement;
    if (input) input.value = '';
  }
}
