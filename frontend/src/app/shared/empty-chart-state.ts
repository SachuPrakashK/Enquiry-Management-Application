import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { SvgIcon } from './svg-icon';

@Component({
  selector: 'app-empty-chart-state',
  imports: [SvgIcon],
  templateUrl: './empty-chart-state.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmptyChartState {
  readonly title = input('No chart data available');
  readonly description = input('There is not enough data to display this chart.');
}
