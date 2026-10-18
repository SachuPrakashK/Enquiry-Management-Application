import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'warning' | 'info';
export interface Toast {
  id: number;
  text: string;
  type: ToastType;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly messages = signal<Toast[]>([]);
  private sequence = 0;
  success(text: string) {
    this.show(text, 'success');
  }
  error(text: string) {
    this.show(text, 'error');
  }
  warning(text: string) {
    this.show(text, 'warning');
  }
  info(text: string) {
    this.show(text, 'info');
  }
  dismiss(id: number) {
    this.messages.update((items) => items.filter((item) => item.id !== id));
  }
  private show(text: string, type: ToastType) {
    const id = ++this.sequence;
    this.messages.update((items) => [...items, { id, text, type }]);
    setTimeout(() => this.dismiss(id), type === 'error' ? 8000 : 5000);
  }
}
