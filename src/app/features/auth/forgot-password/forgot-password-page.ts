import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { FieldError } from '../../../shared/components/field-error/field-error';

@Component({
  selector: 'app-forgot-password-page',
  imports: [ReactiveFormsModule, RouterLink, FieldError],
  template: `
    @if (!sent()) {
      <h2 class="h3 mb-1">Reset your password</h2>
      <p class="text-body-secondary mb-4">Enter your work email and we'll send you a reset link.</p>
      <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <div class="mb-4">
          <label for="email" class="form-label">Work email</label>
          <input id="email" type="email" class="form-control form-control-lg fs-6" formControlName="email"
                 placeholder="you@company.com"
                 [class.is-invalid]="form.controls.email.touched && form.controls.email.invalid" />
          <app-field-error [control]="form.controls.email" label="Email" />
        </div>
        <button type="submit" class="btn btn-primary btn-lg w-100 fs-6" [disabled]="sending()">
          @if (sending()) {
            <span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
          }
          Send reset link
        </button>
      </form>
    } @else {
      <div class="text-center" animate.enter="anim-fade-up">
        <div class="icon-box icon-box-lg rounded-circle bg-success-subtle text-success-emphasis mx-auto mb-3">
          <i class="bi bi-envelope-check"></i>
        </div>
        <h2 class="h4 mb-2">Check your inbox</h2>
        <p class="text-body-secondary">
          If an account exists for <strong>{{ form.value.email }}</strong>, you'll receive a reset link shortly.
        </p>
      </div>
    }
    <div class="text-center mt-4">
      <a routerLink="/auth/login" class="small"><i class="bi bi-arrow-left me-1"></i>Back to sign in</a>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class ForgotPasswordPage {
  protected readonly sent = signal(false);
  protected readonly sending = signal(false);
  protected readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    // No email service in the demo — simulate the request
    this.sending.set(true);
    setTimeout(() => {
      this.sending.set(false);
      this.sent.set(true);
    }, 600);
  }
}
