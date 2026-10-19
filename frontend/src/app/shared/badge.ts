import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { EnquiryStatus } from './models';
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-badge',
  templateUrl: './badge.html',
})
export class Badge {
  readonly status = input<EnquiryStatus>();
  readonly label = input('Unknown');
  readonly color = computed(
    () =>
      this.status()?.color ||
      (
        {
          Low: '#69829a',
          Medium: '#3677b7',
          High: '#bf8329',
          Urgent: '#be5260',
          Active: '#16a34a',
          Inactive: '#7b8696',
        } as Record<string, string>
      )[this.label()] ||
      '#64748b',
  );
}
