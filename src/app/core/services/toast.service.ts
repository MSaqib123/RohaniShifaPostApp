import { Injectable, signal } from '@angular/core';

export type ToastType = 'info' | 'success' | 'error' | 'warning';

export interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

/**
 * Accessible, signal-based toast system (§34).
 * Callers pass already-translated messages (services inject I18nService).
 * The viewport renders via `<app-toast-viewport>` in the root component and
 * announces politely through the ARIA live region it hosts.
 */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private sequence = 0;
  private readonly state = signal<ToastItem[]>([]);

  readonly toasts = this.state.asReadonly();

  show(message: string, type: ToastType = 'info', durationMs = 4500): number {
    const id = ++this.sequence;
    this.state.update((items) => [...items, { id, message, type }]);
    if (durationMs > 0) {
      setTimeout(() => this.dismiss(id), durationMs);
    }
    return id;
  }

  success(message: string): number {
    return this.show(message, 'success');
  }

  error(message: string, durationMs = 6500): number {
    return this.show(message, 'error', durationMs);
  }

  info(message: string): number {
    return this.show(message, 'info');
  }

  warning(message: string): number {
    return this.show(message, 'warning');
  }

  dismiss(id: number): void {
    this.state.update((items) => items.filter((item) => item.id !== id));
  }
}
