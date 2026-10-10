import { ChangeDetectionStrategy, Component, effect, inject, viewChild } from '@angular/core';
import { ConfirmService } from '../../../core/services/confirm.service';
import { Modal } from '../modal/modal';

/** Single global confirmation dialog driven by {@link ConfirmService}. */
@Component({
  selector: 'app-confirm-dialog',
  imports: [Modal],
  template: `
    <app-modal #modal [title]="opts()?.title ?? ''" size="sm" (closed)="confirm.settle(false)">
      @if (opts(); as o) {
        <div class="d-flex gap-3">
          <div class="icon-box rounded-circle bg-{{ o.tone ?? 'danger' }}-subtle text-{{ o.tone ?? 'danger' }}-emphasis">
            <i class="bi {{ o.icon ?? 'bi-exclamation-triangle' }}"></i>
          </div>
          <p class="mb-0 text-body-secondary">{{ o.message }}</p>
        </div>
      }
      <ng-container modal-footer>
        <button type="button" class="btn btn-light border" (click)="answer(false)">
          {{ opts()?.cancelText ?? 'Cancel' }}
        </button>
        <button type="button" class="btn btn-{{ opts()?.tone ?? 'danger' }}" (click)="answer(true)">
          {{ opts()?.confirmText ?? 'Confirm' }}
        </button>
      </ng-container>
    </app-modal>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmDialog {
  protected readonly confirm = inject(ConfirmService);
  protected readonly opts = this.confirm.pending;
  private readonly modal = viewChild.required<Modal>('modal');

  constructor() {
    effect(() => {
      if (this.opts()) this.modal().open();
    });
  }

  protected answer(ok: boolean): void {
    this.confirm.settle(ok);
    this.modal().close();
  }
}
