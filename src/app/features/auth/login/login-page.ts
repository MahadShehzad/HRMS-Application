import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { errorMessage } from '../../../core/http/error.interceptor';
import { FieldError } from '../../../shared/components/field-error/field-error';

interface DemoAccount {
  role: string;
  email: string;
  password: string;
  icon: string;
}

@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule, RouterLink, FieldError],
  templateUrl: './login-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  /** Bound from `?returnUrl=` by `withComponentInputBinding`. */
  readonly returnUrl = input<string>('');

  protected readonly submitting = signal(false);
  protected readonly error = signal('');
  protected readonly showPassword = signal(false);

  protected readonly demoAccounts: DemoAccount[] = [
    { role: 'Admin', email: 'admin@peoplecore.io', password: 'admin123', icon: 'bi-shield-lock' },
    { role: 'HR Manager', email: 'hr@peoplecore.io', password: 'hr123', icon: 'bi-person-badge' },
    { role: 'Employee', email: 'employee@peoplecore.io', password: 'emp123', icon: 'bi-person' },
  ];

  protected readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(4)]],
    remember: [true],
  });

  protected useDemo(account: DemoAccount): void {
    this.form.patchValue({ email: account.email, password: account.password });
    this.error.set('');
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.error.set('');
    this.auth.login(this.form.getRawValue()).subscribe({
      next: () => this.router.navigateByUrl(this.returnUrl() || '/dashboard'),
      error: (err) => {
        this.error.set(errorMessage(err));
        this.submitting.set(false);
      },
    });
  }
}
