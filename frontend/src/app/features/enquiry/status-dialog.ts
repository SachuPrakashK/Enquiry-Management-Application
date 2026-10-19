import { ButtonLoader } from '../../shared/button-loader';
import { ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EnquiryStore } from './enquiry.store';
import { Enquiry } from '../../shared/models';
import { FieldError } from '../../shared/field-error';
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-status-dialog',
  imports: [ButtonLoader, ReactiveFormsModule, FieldError],
  templateUrl: './status-dialog.html',
})
export class StatusDialog {
  readonly store = inject(EnquiryStore);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  readonly enquiry = signal<Enquiry | null>(null);
  readonly status = new FormControl('', { nonNullable: true, validators: Validators.required });
  readonly form = new FormGroup({ status: this.status });
  readonly statuses = computed(() =>
    this.store.statuses().filter((item) => item.isActive || item.id === this.enquiry()?.statusId),
  );
  open(item: Enquiry) {
    this.enquiry.set(item);
    this.status.reset(item.statusId);
    this.store.error.set('');
    this.dialog().nativeElement.showModal();
  }
  close() {
    this.dialog().nativeElement.close();
  }
  cancel(event: Event) {
    if (this.store.saving()) event.preventDefault();
  }
  submit() {
    if (this.store.saving()) return;
    if (this.status.invalid) {
      this.status.markAsTouched();
      return;
    }
    const item = this.enquiry();
    if (item)
      this.store
        .changeStatus(item.id, this.status.value)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => this.close());
  }
}
