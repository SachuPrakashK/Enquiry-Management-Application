import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastService } from './core/toast.service';
import { GlobalLoader } from './shared/global-loader';
import { SvgIcon } from './shared/svg-icon';
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, GlobalLoader, SvgIcon],
  selector: 'app-root',
  templateUrl: './app.html',
})
export class App {
  readonly toasts = inject(ToastService);
}
