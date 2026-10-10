import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { DepartmentService, EmployeeService, PerformanceService } from '../../core/data';
import { fullName, PerformanceReview, RATING_LABELS, ReviewStatus } from '../../core/models';
import { ConfirmService } from '../../core/services/confirm.service';
import { ToastService } from '../../core/services/toast.service';
import { quarterKey, todayIso } from '../../core/utils/date.utils';
import {
  Avatar,
  BarListChart,
  EmptyState,
  FieldError,
  Modal,
  PageHeader,
  Rating,
  Skeleton,
  StatCard,
  StatusBadge,
} from '../../shared';

@Component({
  selector: 'app-performance-page',
  imports: [
    RouterLink,
    DatePipe,
    ReactiveFormsModule,
    PageHeader,
    StatCard,
    StatusBadge,
    Avatar,
    Rating,
    Modal,
    FieldError,
    Skeleton,
    EmptyState,
    BarListChart,
  ],
  templateUrl: './performance-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class PerformancePage {
  protected readonly auth = inject(AuthService);
  protected readonly reviews = inject(PerformanceService);
  protected readonly employees = inject(EmployeeService);
  protected readonly departments = inject(DepartmentService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly formModal = viewChild.required<Modal>('formModal');
  private readonly viewModal = viewChild.required<Modal>('viewModal');

  protected readonly ratingLabels = RATING_LABELS;
  protected readonly loaded = computed(() => this.reviews.loaded() && this.employees.loaded());

  // ---- Filters --------------------------------------------------------------
  protected readonly periodFilter = signal('');
  protected readonly statusFilter = signal('');
  protected readonly deptFilter = signal('');
  protected readonly search = signal('');

  protected readonly periods = computed(() =>
    [...new Set([quarterKey(), ...this.reviews.items().map((r) => r.period)])].sort().reverse(),
  );

  protected readonly visible = computed(() => {
    const me = this.auth.user()?.employeeId;
    const q = this.search().trim().toLowerCase();
    const byId = this.employees.byId();
    return this.reviews
      .items()
      .filter((r) => this.auth.isManager() || r.employeeId === me)
      .filter(
        (r) =>
          (!this.periodFilter() || r.period === this.periodFilter()) &&
          (!this.statusFilter() || r.status === this.statusFilter()) &&
          (!this.deptFilter() || byId.get(r.employeeId)?.departmentId === this.deptFilter()) &&
          (!q || this.nameOf(r.employeeId).toLowerCase().includes(q)),
      )
      .sort((a, b) => b.period.localeCompare(a.period) || this.nameOf(a.employeeId).localeCompare(this.nameOf(b.employeeId)));
  });

  protected readonly stats = computed(() => {
    const list = this.visible();
    const rated = list.filter((r) => r.status !== 'draft');
    return {
      total: list.length,
      avg: rated.length ? rated.reduce((s, r) => s + r.rating, 0) / rated.length : 0,
      completed: list.filter((r) => r.status === 'acknowledged').length,
      top: list.filter((r) => r.rating >= 4).length,
    };
  });

  protected readonly distribution = computed(() =>
    [5, 4, 3, 2, 1].map((n) => ({
      label: `${n}★ ${RATING_LABELS[n]}`,
      value: this.visible().filter((r) => r.rating === n).length,
    })),
  );

  protected readonly employeeOptions = computed(() =>
    [...this.employees.workforce()].sort((a, b) => fullName(a).localeCompare(fullName(b))),
  );

  // ---- Form -----------------------------------------------------------------
  protected readonly editing = signal<PerformanceReview | null>(null);
  protected readonly viewing = signal<PerformanceReview | null>(null);
  protected readonly saving = signal(false);

  protected readonly form = this.fb.group({
    employeeId: ['', Validators.required],
    period: [quarterKey(), [Validators.required, Validators.pattern(/^\d{4}-Q[1-4]$/)]],
    rating: [3, [Validators.required, Validators.min(1), Validators.max(5)]],
    strengths: ['', Validators.required],
    improvements: ['', Validators.required],
    status: ['draft' as ReviewStatus],
    goals: this.fb.array([this.goalGroup()]),
  });

  protected get goals(): FormArray {
    return this.form.controls.goals;
  }

  constructor() {
    this.reviews.ensureLoaded();
    this.employees.ensureLoaded();
    this.departments.ensureLoaded();
  }

  private goalGroup(title = '', progress = 0) {
    return this.fb.group({
      title: [title, Validators.required],
      progress: [progress, [Validators.min(0), Validators.max(100)]],
    });
  }

  protected nameOf(id: string): string {
    return this.employees.nameOf(id);
  }

  protected designationOf(id: string): string {
    return this.employees.byId().get(id)?.designation ?? '';
  }

  protected avgProgress(r: PerformanceReview): number {
    return r.goals.length ? Math.round(r.goals.reduce((s, g) => s + g.progress, 0) / r.goals.length) : 0;
  }

  protected addGoal(): void {
    this.goals.push(this.goalGroup());
  }

  protected removeGoal(i: number): void {
    if (this.goals.length > 1) this.goals.removeAt(i);
  }

  protected openCreate(): void {
    this.editing.set(null);
    this.goals.clear();
    this.goals.push(this.goalGroup());
    this.form.reset({ employeeId: '', period: quarterKey(), rating: 3, strengths: '', improvements: '', status: 'draft' });
    this.formModal().open();
  }

  protected openEdit(r: PerformanceReview): void {
    this.editing.set(r);
    this.goals.clear();
    r.goals.forEach((g) => this.goals.push(this.goalGroup(g.title, g.progress)));
    this.form.reset({ ...r, goals: r.goals });
    this.viewModal().close();
    this.formModal().open();
  }

  protected openView(r: PerformanceReview): void {
    this.viewing.set(r);
    this.viewModal().open();
  }

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const payload = {
      ...v,
      rating: Number(v.rating),
      goals: v.goals.map((g) => ({ title: g.title.trim(), progress: Number(g.progress) })),
    };
    const editing = this.editing();
    this.saving.set(true);
    const req = editing
      ? this.reviews.update(editing.id, payload)
      : this.reviews.create({ ...payload, reviewerId: this.auth.user()!.employeeId, createdOn: todayIso() });
    req.subscribe({
      next: (r) => {
        this.saving.set(false);
        this.formModal().close();
        this.toast.success(`Review for ${this.nameOf(r.employeeId)} ${editing ? 'updated' : 'created'}.`);
      },
      error: () => this.saving.set(false),
    });
  }

  protected acknowledge(r: PerformanceReview): void {
    this.reviews.update(r.id, { status: 'acknowledged' }).subscribe((u) => {
      this.viewing.set(u);
      this.toast.success('Thanks — your review has been acknowledged.');
    });
  }

  protected async remove(r: PerformanceReview): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'Delete review',
      message: `Delete the ${r.period} review for ${this.nameOf(r.employeeId)}?`,
      confirmText: 'Delete',
    });
    if (ok) this.reviews.remove(r.id).subscribe(() => this.toast.success('Review deleted.'));
  }
}
