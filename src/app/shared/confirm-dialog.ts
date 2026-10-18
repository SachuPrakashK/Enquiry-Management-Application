import { ButtonLoader } from './button-loader';
import { ChangeDetectionStrategy, Component, ElementRef, input, output, viewChild } from '@angular/core';
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonLoader],
  selector: 'app-confirm-dialog',
  templateUrl: './confirm-dialog.html',
})
export class ConfirmDialog {
  readonly title = input('Delete this record?');
  readonly message = input('This action cannot be undone.');
  readonly confirmText = input('Delete');
  readonly cancelText = input('Cancel');
  readonly confirmationType = input<'danger' | 'primary'>('danger');
  readonly busy = input(false);
  readonly error = input('');
  readonly confirmed = output<void>();
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private opener: HTMLElement | null = null;
  open() {
    this.opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.dialog().nativeElement.showModal();
  }
  close() {
    this.dialog().nativeElement.close();
    this.opener?.focus();
    this.opener = null;
  }
  cancel(event: Event) {
    if (this.busy()) event.preventDefault();
  }
}
