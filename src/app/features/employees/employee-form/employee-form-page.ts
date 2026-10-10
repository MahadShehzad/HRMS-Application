import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HasUnsavedChanges } from '../../../core/auth/unsaved-changes.guard';
import { DepartmentService, EmployeeService } from '../../../core/data';
import {
  Employee,
  EMPLOYMENT_STATUSES,
  EMPLOYMENT_TYPES,
  EmploymentStatus,
  EmploymentType,
  fullName,
  Gender,
} from '../../../core/models';
import { ToastService } from '../../../core/services/toast.service';
import { todayIso, yearsBetween } from '../../../core/utils/date.utils';
import { FieldError, LabelPipe, PageHeader, Skeleton } from '../../../shared';

const PHONE = /^[+\d\s().-]{7,20}$/;

function minimumAge(years: number) {
  return (c: AbstractControl): ValidationErrors | null =>
    c.value && yearsBetween(c.value) < years ? { custom: `Employee must be at least ${years} years old` } : null;
}

@Component({
  selector: 'app-employee-form-page',
  imports: [ReactiveFormsModule, RouterLink, PageHeader, FieldError, LabelPipe, Skeleton],
  templateUrl: './employee-form-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class EmployeeFormPage implements HasUnsavedChanges {
  private readonly employees = inject(EmployeeService);
  protected readonly departments = inject(DepartmentService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  /** Route param — present when editing, absent on /employees/new. */
  readonly id = input<string>();

  protected readonly isEdit = computed(() => !!this.id());
  protected readonly saving = signal(false);
  protected readonly types = EMPLOYMENT_TYPES;
  protected readonly statuses = EMPLOYMENT_STATUSES;
  protected readonly genders: Gender[] = ['female', 'male', 'other'];
  protected readonly ready = computed(() => this.employees.loaded() && this.departments.loaded());

  protected readonly existing = computed(() => (this.id() ? this.employees.byId().get(this.id()!) : undefined));
  protected readonly managers = computed(() =>
    this.employees
      .workforce()
      .filter((e) => e.id !== this.id())
      .sort((a, b) => fullName(a).localeCompare(fullName(b))),
  );
  protected readonly title = computed(() =>
    this.isEdit() ? `Edit ${fullName(this.existing())}` : 'New employee',
  );

  protected readonly form = inject(FormBuilder).nonNullable.group({
    firstName: ['', [Validators.required, Validators.maxLength(50)]],
    lastName: ['', [Validators.required, Validators.maxLength(50)]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required, Validators.pattern(PHONE)]],
    gender: ['female' as Gender, Validators.required],
    dateOfBirth: ['', [Validators.required, minimumAge(16)]],
    departmentId: ['', Validators.required],
    designation: ['', [Validators.required, Validators.maxLength(80)]],
    managerId: [''],
    employmentType: ['full-time' as EmploymentType, Validators.required],
    status: ['probation' as EmploymentStatus, Validators.required],
    joinDate: [todayIso(), Validators.required],
    salary: [60000, [Validators.required, Validators.min(0), Validators.max(10_000_000)]],
    address: ['', Validators.required],
    city: ['', Validators.required],
    country: ['', Validators.required],
    emergencyName: [''],
    emergencyRelation: [''],
    emergencyPhone: ['', Validators.pattern(PHONE)],
    skills: [''],
    bankAccount: [''],
  });

  constructor() {
    this.employees.ensureLoaded();
    this.departments.ensureLoaded();

    // Populate once the record is available (edit mode)
    let patched = false;
    effect(() => {
      const e = this.existing();
      if (!e || patched) return;
      patched = true;
      this.form.reset({
        ...e,
        managerId: e.managerId ?? '',
        emergencyName: e.emergencyContact.name,
        emergencyRelation: e.emergencyContact.relation,
        emergencyPhone: e.emergencyContact.phone,
        skills: e.skills.join(', '),
      });
    });
  }

  /** Used by the unsaved-changes guard. */
  hasUnsavedChanges(): boolean {
    return this.form.dirty && !this.saving();
  }

  protected invalid(name: keyof typeof this.form.controls): boolean {
    const c = this.form.controls[name];
    return c.invalid && (c.touched || c.dirty);
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.warning('Please fix the highlighted fields.');
      document.querySelector<HTMLElement>('.is-invalid')?.focus();
      return;
    }
    const v = this.form.getRawValue();
    const payload: Omit<Employee, 'id' | 'code'> = {
      firstName: v.firstName.trim(),
      lastName: v.lastName.trim(),
      email: v.email.trim().toLowerCase(),
      phone: v.phone.trim(),
      gender: v.gender,
      dateOfBirth: v.dateOfBirth,
      joinDate: v.joinDate,
      departmentId: v.departmentId,
      designation: v.designation.trim(),
      managerId: v.managerId || null,
      employmentType: v.employmentType,
      status: v.status,
      salary: Number(v.salary),
      address: v.address.trim(),
      city: v.city.trim(),
      country: v.country.trim(),
      skills: v.skills.split(',').map((s) => s.trim()).filter(Boolean),
      emergencyContact: { name: v.emergencyName, relation: v.emergencyRelation, phone: v.emergencyPhone },
      bankAccount: v.bankAccount,
    };

    this.saving.set(true);
    const request = this.isEdit()
      ? this.employees.update(this.id()!, payload)
      : this.employees.create({ ...payload, code: '' } as Omit<Employee, 'id'>);

    request.subscribe({
      next: (saved) => {
        this.form.markAsPristine();
        this.toast.success(`${fullName(saved)} was ${this.isEdit() ? 'updated' : 'added'}.`);
        this.router.navigate(['/employees', saved.id]);
      },
      error: () => this.saving.set(false),
    });
  }
}
