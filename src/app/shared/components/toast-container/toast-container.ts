import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastKind, ToastService } from '../../../core/services/toast.service';

const META: Record<ToastKind, { icon: string; tone: string; title: string }> = {
  success: { icon: 'bi-check-circle-fill', tone: 'success', title: 'Success' },
  error: { icon: 'bi-x-octagon-fill', tone: 'danger', title: 'Error' },
  warning: { icon: 'bi-exclamation-triangle-fill', tone: 'warning', title: 'Warning' },
  info: { icon: 'bi-info-circle-fill', tone: 'primary', title: 'Info' },
};

/** Bootstrap toasts stacked bottom-right; slide in/out via `animate.enter/leave`. */
@Component({
  selector: 'app-toast-container',
  template: `
    <div class="toast-stack toast-container position-fixed bottom-0 end-0 p-3" aria-live="polite">
      @for (t of toasts.toasts(); track t.id) {
        <div class="toast show shadow" role="alert"
             [style.border-left-color]="'var(--bs-' + meta[t.kind].tone + ')'"
             animate.enter="anim-toast-in" animate.leave="anim-toast-out">
          <div class="d-flex align-items-start gap-2 p-3">
            <i class="bi {{ meta[t.kind].icon }} text-{{ meta[t.kind].tone }} fs-5 lh-1"></i>
            <div class="flex-grow-1 min-w-0">
              <div class="fw-semibold small">{{ t.title ?? meta[t.kind].title }}</div>
              <div class="small text-body-secondary">{{ t.message }}</div>
            </div>
            <button type="button" class="btn-close btn-close-sm small" aria-label="Dismiss"
                    (click)="toasts.dismiss(t.id)"></button>
          </div>
        </div>
      }
    </div>
  `,
  styles: `
    .toast-stack { z-index: 1090; }
    .toast { background: var(--bs-body-bg); border-left-width: 3px; }
    .btn-close-sm { font-size: 0.65rem; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToastContainer {
  protected readonly toasts = inject(ToastService);
  protected readonly meta = META;
}
