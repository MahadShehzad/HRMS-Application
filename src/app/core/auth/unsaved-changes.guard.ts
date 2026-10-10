import { inject } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';
import { ConfirmService } from '../services/confirm.service';

export interface HasUnsavedChanges {
  hasUnsavedChanges(): boolean;
}

/** Asks before leaving a form with unsaved edits. */
export const unsavedChangesGuard: CanDeactivateFn<HasUnsavedChanges> = (component) => {
  if (!component.hasUnsavedChanges()) return true;
  return inject(ConfirmService).ask({
    title: 'Discard changes?',
    message: 'You have unsaved changes on this page. If you leave now they will be lost.',
    confirmText: 'Discard',
    cancelText: 'Keep editing',
    tone: 'warning',
  });
};
