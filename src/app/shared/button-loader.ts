import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-button-loader',
  templateUrl: './button-loader.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ButtonLoader {}
