import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DepartmentService, EmployeeService } from '../../core/data';
import { Department, fullName } from '../../core/models';
import { ConfirmService } from '../../core/services/confirm.service';
import { ToastService } from '../../core/services/toast.service';
import { todayIso } from '../../core/utils/date.utils';
import {
  Avatar,
  CompactPipe,
  EmptyState,
  FieldError,
  Modal,
  PageHeader,
  SERIES_COLORS,
  Skeleton,
  StatCard,
} from '../../shared';

@Component({
  selector: 'app-departments-page',
  imports: [
    RouterLink,
    CompactPipe,
    ReactiveFormsModule,
    PageHeader,
    StatCard,
    Avatar,
    Modal,
    FieldError,
    Skeleton,
    EmptyState,
  ],
  templateUrl: './departments-page.html',
  styleUrl: './departments-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class DepartmentsPage {
  protected readonly departments = inject(DepartmentService);
  protected readonly employees = inject(EmployeeService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  private readonly modal = viewChild.required<Modal>('modal');

  protected readonly search = signal('');
  protected readonly editing = signal<Department | null>(null);
  protected readonly saving = signal(false);
  protected readonly loaded = computed(() => this.departments.loaded() && this.employees.loaded());

  protected readonly form = inject(FormBuilder).nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(60)]],
    code: ['', [Validators.required, Validators.pattern(/^[A-Za-z]{2,5}$/)]],
    description: ['', Validators.maxLength(240)],
    headId: [''],
    location: ['', Validators.required],
    budget: [500000, [Validators.required, Validators.min(0)]],
  });

  protected readonly cards = computed(() => {
    const q = this.search().trim().toLowerCase();
    const workforce = this.employees.workforce();
    return this.departments
      .items()
      .map((d, i) => {
        const members = workforce.filter((e) => e.departmentId === d.id);
        return {
          dept: d,
          color: SERIES_COLORS[i % SERIES_COLORS.length],
          head: d.headId ? this.employees.byId().get(d.headId) : undefined,
          count: members.length,
          payroll: members.reduce((s, e) => s + e.salary, 0),
          preview: members.slice(0, 4).map((e) => fullName(e)),
        };
      })
      .filter((c) => !q || `${c.dept.name} ${c.dept.code} ${c.dept.location}`.toLowerCase().includes(q));
  });

  protected readonly totals = computed(() => {
    const items = this.departments.items();
    const budget = items.reduce((s, d) => s + d.budget, 0);
    const people = this.employees.workforce().length;
    return { count: items.length, budget, avgSize: items.length ? people / items.length : 0, people };
  });

  protected readonly headOptions = computed(() =>
    [...this.employees.workforce()].sort((a, b) => fullName(a).localeCompare(fullName(b))),
  );

  constructor() {
    this.departments.ensureLoaded();
    this.employees.ensureLoaded();
  }

  protected openCreate(): void {
    this.editing.set(null);
    this.form.reset({ name: '', code: '', description: '', headId: '', location: '', budget: 500000 });
    this.modal().open();
  }

  protected openEdit(d: Department): void {
    this.editing.set(d);
    this.form.reset({ ...d, headId: d.headId ?? '' });
    this.modal().open();
  }

  protected invalid(name: keyof typeof this.form.controls): boolean {
    const c = this.form.controls[name];
    return c.invalid && c.touched;
  }

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const payload = { ...v, code: v.code.toUpperCase(), headId: v.headId || null, budget: Number(v.budget) };
    const editing = this.editing();
    this.saving.set(true);
    const req = editing
      ? this.departments.update(editing.id, payload)
      : this.departments.create({ ...payload, createdAt: todayIso() });
    req.subscribe({
      next: (d) => {
        this.saving.set(false);
        this.modal().close();
        this.toast.success(`${d.name} ${editing ? 'updated' : 'created'}.`);
      },
      error: () => this.saving.set(false),
    });
  }

  protected async remove(d: Department): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'Delete department',
      message: `Delete the ${d.name} department? Departments with active employees cannot be deleted.`,
      confirmText: 'Delete',
      icon: 'bi-trash3',
    });
    if (ok) this.departments.remove(d.id).subscribe(() => this.toast.success(`${d.name} deleted.`));
  }
}
