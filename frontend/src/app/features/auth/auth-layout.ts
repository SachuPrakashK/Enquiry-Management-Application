import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush, selector: 'app-auth-layout', imports: [RouterOutlet], templateUrl: './auth-layout.html' })
export class AuthLayout {}
