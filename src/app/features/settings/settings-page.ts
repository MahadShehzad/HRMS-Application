import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/auth/auth.service';
import { errorMessage } from '../../core/http/error.interceptor';
import { EmployeeService, SystemService } from '../../core/data';
import { ROLE_LABELS } from '../../core/models';
import { CacheRegistry } from '../../core/services/cache-registry.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { PreferencesService, ThemeMode } from '../../core/services/preferences.service';
import { ToastService } from '../../core/services/toast.service';
import { Avatar, FieldError, PageHeader } from '../../shared';

type Tab = 'profile' | 'preferences' | 'security' | 'system';

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const next = group.get('newPassword')?.value;
  const confirm = group.get('confirmPassword');
  if (!confirm) return null;
  if (confirm.value && next !== confirm.value) {
    confirm.setErrors({ custom: 'Passwords do not match' });
  } else if (confirm.hasError('custom')) {
    // Re-run the control's own validators to drop the stale mismatch error
    confirm.setErrors(null);
    confirm.updateValueAndValidity({ onlySelf: true, emitEvent: false });
  }
  return null;
}

@Component({
  selector: 'app-settings-page',
  imports: [ReactiveFormsModule, PageHeader, Avatar, FieldError],
  templateUrl: './settings-page.html',
  styleUrl: './settings-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class SettingsPage {
  protected readonly auth = inject(AuthService);
  protected readonly prefs = inject(PreferencesService);
  private readonly employees = inject(EmployeeService);
  private readonly system = inject(SystemService);
  private readonly caches = inject(CacheRegistry);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder).nonNullable;

  protected readonly env = environment;
  protected readonly roleLabels = ROLE_LABELS;
  protected readonly tab = signal<Tab>('profile');
  protected readonly tabs = computed(() => {
    const list: { key: Tab; label: string; icon: string }[] = [
      { key: 'profile', label: 'Profile', icon: 'bi-person' },
      { key: 'preferences', label: 'Preferences', icon: 'bi-sliders' },
      { key: 'security', label: 'Security', icon: 'bi-shield-lock' },
    ];
    if (this.auth.isAdmin()) list.push({ key: 'system', label: 'System', icon: 'bi-hdd-stack' });
    return list;
  });

  protected readonly me = computed(() => this.employees.byId().get(this.auth.user()?.employeeId ?? ''));
  protected readonly themes: { value: ThemeMode; label: string; icon: string }[] = [
    { value: 'light', label: 'Light', icon: 'bi-sun' },
    { value: 'dark', label: 'Dark', icon: 'bi-moon-stars' },
    { value: 'auto', label: 'System', icon: 'bi-circle-half' },
  ];

  protected readonly savingProfile = signal(false);
  protected readonly savingPassword = signal(false);
  protected readonly passwordError = signal('');
  protected readonly resetting = signal(false);

  protected readonly profileForm = this.fb.group({
    phone: ['', [Validators.required, Validators.pattern(/^[+\d\s().-]{7,20}$/)]],
    address: ['', Validators.required],
    city: ['', Validators.required],
    country: ['', Validators.required],
    emergencyName: [''],
    emergencyRelation: [''],
    emergencyPhone: [''],
  });

  protected readonly passwordForm = this.fb.group(
    {
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(8), Validators.pattern(/(?=.*\d)(?=.*[A-Za-z])/)]],
      confirmPassword: ['', Validators.required],
    },
    { validators: passwordsMatch },
  );

  constructor() {
    this.employees.ensureLoaded();
    let patched = false;
    effect(() => {
      const e = this.me();
      if (!e || patched) return;
      patched = true;
      this.profileForm.reset({
        phone: e.phone,
        address: e.address,
        city: e.city,
        country: e.country,
        emergencyName: e.emergencyContact.name,
        emergencyRelation: e.emergencyContact.relation,
        emergencyPhone: e.emergencyContact.phone,
      });
    });
  }

  protected saveProfile(): void {
    const e = this.me();
    if (!e || this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }
    const v = this.profileForm.getRawValue();
    this.savingProfile.set(true);
    this.employees
      .update(e.id, {
        phone: v.phone,
        address: v.address,
        city: v.city,
        country: v.country,
        emergencyContact: { name: v.emergencyName, relation: v.emergencyRelation, phone: v.emergencyPhone },
      })
      .subscribe({
        next: () => {
          this.savingProfile.set(false);
          this.profileForm.markAsPristine();
          this.toast.success('Your profile has been updated.');
        },
        error: () => this.savingProfile.set(false),
      });
  }

  protected changePassword(): void {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }
    const { currentPassword, newPassword } = this.passwordForm.getRawValue();
    this.savingPassword.set(true);
    this.passwordError.set('');
    this.auth.changePassword(currentPassword, newPassword).subscribe({
      next: () => {
        this.savingPassword.set(false);
        this.passwordForm.reset();
        this.toast.success('Password changed. Use your new password next time you sign in.');
      },
      error: (err) => {
        this.savingPassword.set(false);
        this.passwordError.set(errorMessage(err));
      },
    });
  }

  protected async resetData(): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'Reset demo data',
      message: 'This replaces every employee, attendance, leave, payroll and recruitment record with fresh demo data. Changes you have made will be lost.',
      confirmText: 'Reset data',
      icon: 'bi-arrow-counterclockwise',
    });
    if (!ok) return;
    this.resetting.set(true);
    this.system.resetDemoData().subscribe({
      next: () => {
        this.resetting.set(false);
        this.caches.clearAll();
        this.toast.success('Demo data has been reset.');
        this.router.navigate(['/dashboard']);
      },
      error: () => this.resetting.set(false),
    });
  }
}
