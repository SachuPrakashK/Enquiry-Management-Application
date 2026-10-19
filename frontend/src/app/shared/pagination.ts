import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { SvgIcon } from './svg-icon';
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-pagination',
  imports: [ReactiveFormsModule, SvgIcon],
  templateUrl: './pagination.html',
})
export class Pagination {
  readonly total = input.required<number>();
  readonly page = input(1);
  readonly size = input(10);
  readonly pageChanged = output<number>();
  readonly sizeChanged = output<number>();
  readonly sizeControl = new FormControl(10, { nonNullable: true });
  readonly pages = computed(() => Math.max(1, Math.ceil(this.total() / this.size())));
  readonly end = computed(() => Math.min(this.page() * this.size(), this.total()));
}
