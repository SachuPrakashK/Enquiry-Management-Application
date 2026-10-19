import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Category, EnquiryFilters, EnquiryOptions, EnquiryStatus } from '../../shared/models';
import { SvgIcon } from '../../shared/svg-icon';
export const emptyFilters: EnquiryFilters = {
  statusId: '',
  categoryId: '',
  priority: '',
  source: '',
  from: '',
  to: '',
  followUp: '',
  customer: '',
};
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-enquiry-filters',
  imports: [ReactiveFormsModule, SvgIcon],
  templateUrl: './enquiry-filters.html',
})
export class EnquiryFilterPanel {
  readonly statuses = input.required<EnquiryStatus[]>();
  readonly categories = input.required<Category[]>();
  readonly options = input.required<EnquiryOptions>();
  readonly applied = output<EnquiryFilters>();
  readonly error = signal('');
  readonly form = inject(NonNullableFormBuilder).group(emptyFilters);
  apply() {
    const value = this.form.getRawValue();
    if (value.from && value.to && value.from > value.to) {
      this.error.set('Created date from must be on or before created date to.');
      return;
    }
    this.error.set('');
    this.applied.emit({ ...value, customer: value.customer.trim().toLowerCase() });
  }
  clear() {
    this.form.reset(emptyFilters);
    this.error.set('');
    this.applied.emit({ ...emptyFilters });
  }
}
