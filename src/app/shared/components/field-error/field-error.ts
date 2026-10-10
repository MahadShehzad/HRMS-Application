import { ChangeDetectionStrategy, Component, computed, effect, input, signal } from '@angular/core';
import { AbstractControl } from '@angular/forms';

/**
 * Shows the first validation message for a control once it's been touched.
 *   <input formControlName="email" class="form-control" [class.is-invalid]="invalid('email')">
 *   <app-field-error [control]="form.controls.email" label="Email" />
 */
@Component({
  selector: 'app-field-error',
  template: `
    @if (message()) {
      <div class="invalid-feedback d-block">{{ message() }}</div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FieldError {
  readonly control = input.required<AbstractControl>();
  readonly label = input('This field');

  /** Bumped on every status change so `message` recomputes (controls aren't signals). */
  private readonly tick = signal(0);

  constructor() {
    effect((onCleanup) => {
      const sub = this.control().events.subscribe(() => this.tick.update((n) => n + 1));
      onCleanup(() => sub.unsubscribe());
    });
  }

  protected readonly message = computed(() => {
    this.tick();
    const c = this.control();
    if (!c.errors || !(c.touched || c.dirty)) return '';
    const e = c.errors;
    const label = this.label();
    if (e['required']) return `${label} is required`;
    if (e['email']) return 'Enter a valid email address';
    if (e['minlength']) return `${label} must be at least ${e['minlength'].requiredLength} characters`;
    if (e['maxlength']) return `${label} must be at most ${e['maxlength'].requiredLength} characters`;
    if (e['min']) return `${label} must be at least ${e['min'].min}`;
    if (e['max']) return `${label} must be at most ${e['max'].max}`;
    if (e['pattern']) return `${label} has an invalid format`;
    if (e['custom']) return e['custom'];
    return `${label} is invalid`;
  });
}
