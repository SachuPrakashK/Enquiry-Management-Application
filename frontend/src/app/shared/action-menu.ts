import { ChangeDetectionStrategy, Component, ElementRef, HostListener, OnDestroy, computed, inject, input, signal, viewChild } from '@angular/core';
import { SvgIcon } from './svg-icon';
import { ActionMenuService } from './action-menu.service';
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush, selector: 'app-action-menu', imports: [SvgIcon], templateUrl: './action-menu.html' })
export class ActionMenu implements OnDestroy {
  private readonly menus = inject(ActionMenuService);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly trigger = viewChild.required<ElementRef<HTMLButtonElement>>('trigger');
  readonly id = input.required<string>();
  readonly label = input('Actions');
  readonly variant = input<'actions' | 'profile'>('actions');
  readonly position = signal({ top: 0, left: 0 });
  readonly above = signal(false);
  readonly open = computed(() => this.menus.openId() === this.id());
  toggle(event: MouseEvent): void {
    event.stopPropagation();
    if (this.open()) { this.close(); return; }
    const rect = this.trigger().nativeElement.getBoundingClientRect();
    const width = this.variant() === 'profile' ? 210 : 190;
    const openAbove = window.innerHeight - rect.bottom < 230 && rect.top > 230;
    this.above.set(openAbove);
    this.position.set({ top: openAbove ? Math.max(8, rect.top - 8) : rect.bottom + 6, left: Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8)) });
    this.menus.openId.set(this.id());
  }
  close(): void { if (this.open()) this.menus.openId.set(null); }
  ngOnDestroy(): void { this.close(); }
  select(): void { this.close(); }
  @HostListener('document:click', ['$event'])
  outside(event: Event): void { if (this.open() && !this.host.nativeElement.contains(event.target as Node)) this.close(); }
  @HostListener('document:keydown.escape')
  @HostListener('window:resize')
  @HostListener('window:scroll')
  closeFromEnvironment(): void { this.close(); }
}
