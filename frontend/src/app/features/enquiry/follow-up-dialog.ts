import { ButtonLoader } from '../../shared/button-loader';
import { ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EnquiryStore } from './enquiry.store';
import { FollowUp, Enquiry } from '../../shared/models';
import { FieldError } from '../../shared/field-error';
import { localDate } from '../../shared/date-utils';
import { SideDrawer } from '../../shared/side-drawer';
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-follow-up-dialog',
  imports: [ButtonLoader, ReactiveFormsModule, FieldError, SideDrawer],
  templateUrl: './follow-up-dialog.html',
})
export class FollowUpDialog {
  readonly store = inject(EnquiryStore);
  private readonly destroyRef = inject(DestroyRef);
  readonly opened = signal(false);
  readonly enquiry = signal<Enquiry | null>(null);
  readonly editing = signal<FollowUp | null>(null);
  readonly dateError = signal('');
  readonly form = inject(NonNullableFormBuilder).group({
    followUpDate: ['', Validators.required],
    followUpType: ['', Validators.required],
    notes: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(5000)]],
    outcome: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(1000)]],
    nextFollowUpDate: [''],
  });
  open(item: Enquiry, followUp?: FollowUp) {
    this.enquiry.set(item);
    this.editing.set(followUp || null);
    this.store.error.set('');
    this.dateError.set('');
    this.form.reset({
      followUpDate: localDate(),
      followUpType: this.store.options().followUpTypes[0] || '',
      notes: '',
      outcome: '',
      nextFollowUpDate: '',
    });
    if (followUp) this.form.patchValue(followUp);
    this.opened.set(true);
  }
  close() {
    if (!this.store.saving()) this.opened.set(false);
  }
  submit() {
    if (this.store.saving()) return;
    this.dateError.set('');
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    if (value.nextFollowUpDate && value.nextFollowUpDate < value.followUpDate) {
      this.dateError.set('Next follow-up must be on or after the follow-up date.');
      return;
    }
    const item = this.enquiry();
    if (item)
      this.store
        .saveFollowUp(
          {
            ...value,
            notes: value.notes.trim(),
            outcome: value.outcome.trim(),
            enquiryId: item.id,
          },
          this.editing()?.id,
        )
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => this.opened.set(false));
  }
}
