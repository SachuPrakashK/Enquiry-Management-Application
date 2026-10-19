import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { LoaderService } from '../core/loader.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-global-loader',
  templateUrl: './global-loader.html',
})
export class GlobalLoader {
  readonly loader = inject(LoaderService);
}
