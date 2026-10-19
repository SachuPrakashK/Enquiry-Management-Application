import { ChangeDetectionStrategy, Component, HostListener, input, output } from '@angular/core';
import { SvgIcon } from './svg-icon';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-side-drawer',
  imports: [SvgIcon],
  templateUrl: './side-drawer.html',
})
export class SideDrawer {
  readonly open = input(false);
  readonly title = input.required<string>();
  readonly subtitle = input('');
  readonly width = input<'normal' | 'enquiry' | 'wide'>('normal');
  readonly loading = input(false);
  readonly closed = output<void>();

  requestClose(): void {
    if (!this.loading()) this.closed.emit();
  }

  @HostListener('document:keydown.escape')
  closeOnEscape(): void {
    if (this.open()) this.requestClose();
  }
}
