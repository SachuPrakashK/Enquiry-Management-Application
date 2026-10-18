import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SvgIcon } from './svg-icon';
export interface Breadcrumb {
  label: string;
  url: string;
}
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-page-header',
  imports: [RouterLink, SvgIcon],
  templateUrl: './page-header.html',
})
export class PageHeader {
  readonly title = input.required<string>();
  readonly description = input('');
  readonly parents = input<readonly Breadcrumb[]>([]);
  readonly backLink = input('');
  readonly headingId = input<string | null>(null);
  readonly compact = input(false);
  readonly navigated = output<void>();
}
