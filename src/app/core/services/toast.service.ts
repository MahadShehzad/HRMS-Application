import { Injectable, signal } from '@angular/core';

export type ToastKind = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
  title?: string;
}

const DURATION: Record<ToastKind, number> = {
  success: 3500,
  info: 4000,
  warning: 5000,
  error: 6000,
};

/** App-wide notification toasts, rendered by `<app-toast-container>`. */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private seq = 0;
  private readonly timers = new Map<number, ReturnType<typeof setTimeout>>();
  readonly toasts = signal<Toast[]>([]);

  success(message: string, title?: string) {
    this.show('success', message, title);
  }

  error(message: string, title?: string) {
    this.show('error', message, title);
  }

  warning(message: string, title?: string) {
    this.show('warning', message, title);
  }

  info(message: string, title?: string) {
    this.show('info', message, title);
  }

  dismiss(id: number): void {
    clearTimeout(this.timers.get(id));
    this.timers.delete(id);
    this.toasts.update((list) => list.filter((t) => t.id !== id));
  }

  private show(kind: ToastKind, message: string, title?: string): void {
    // Collapse identical messages fired in quick succession
    if (this.toasts().some((t) => t.message === message && t.kind === kind)) return;
    const toast: Toast = { id: ++this.seq, kind, message, title };
    this.toasts.update((list) => [...list.slice(-3), toast]);
    this.timers.set(
      toast.id,
      setTimeout(() => this.dismiss(toast.id), DURATION[kind]),
    );
  }
}
