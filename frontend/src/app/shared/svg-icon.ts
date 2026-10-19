import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type IconName =
  | 'dashboard'
  | 'menu'
  | 'close'
  | 'chevron-left'
  | 'chevron-right'
  | 'back'
  | 'home'
  | 'search'
  | 'filter'
  | 'plus'
  | 'edit'
  | 'delete'
  | 'view'
  | 'save'
  | 'cancel'
  | 'user'
  | 'users'
  | 'profile'
  | 'enquiry'
  | 'category'
  | 'status'
  | 'follow-up'
  | 'calendar'
  | 'email'
  | 'phone'
  | 'settings'
  | 'success'
  | 'error'
  | 'warning'
  | 'info'
  | 'logout'
  | 'lock'
  | 'eye'
  | 'eye-off'
  | 'more-vertical'
  | 'camera';

@Component({
  selector: 'app-svg-icon',
  templateUrl: './svg-icon.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SvgIcon {
  readonly name = input.required<IconName>();
}
