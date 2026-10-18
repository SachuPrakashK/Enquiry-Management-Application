import { Injectable, signal } from '@angular/core';
@Injectable({ providedIn: 'root' })
export class ActionMenuService {
  readonly openId = signal<string | null>(null);
}
