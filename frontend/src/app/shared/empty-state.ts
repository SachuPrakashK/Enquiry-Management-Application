import { ChangeDetectionStrategy, Component, input } from '@angular/core';
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-empty-state',
  templateUrl: './empty-state.html',
})
export class EmptyState {
  readonly title = input('No data found');
  readonly description = input('There are no records to display.');
  readonly illustration = input('assets/images/no-data.svg');
}
