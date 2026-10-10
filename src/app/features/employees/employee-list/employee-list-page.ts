import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  linkedSignal,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { DepartmentService, EmployeeService } from '../../../core/data';
import {
  Employee,
  EMPLOYMENT_STATUSES,
  EMPLOYMENT_TYPES,
  fullName,
  SortState,
} from '../../../core/models';
import { ConfirmService } from '../../../core/services/confirm.service';
import { ToastService } from '../../../core/services/toast.service';
import { downloadCsv } from '../../../core/utils/csv.utils';
import {
  Avatar,
  EmptyState,
  LabelPipe,
  PageHeader,
  Pagination,
  Skeleton,
  StatusBadge,
  TooltipDirective,
} from '../../../shared';

type SortKey = 'name' | 'code' | 'department' | 'designation' | 'joinDate' | 'status';
type ViewMode = 'table' | 'grid';
const VIEW_KEY = 'hrms.employees.view';

@Component({
  selector: 'app-employee-list-page',
  imports: [
    RouterLink,
    DatePipe,
    PageHeader,
    Avatar,
    StatusBadge,
    Skeleton,
    EmptyState,
    Pagination,
    LabelPipe,
    TooltipDirective,
  ],
  templateUrl: './employee-list-page.html',
  styleUrl: './employee-list-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class EmployeeListPage {
  protected readonly auth = inject(AuthService);
  protected readonly employees = inject(EmployeeService);
  protected readonly departments = inject(DepartmentService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);

  /** Pre-filters from the URL, e.g. /employees?department=dep_eng */
  readonly department = input('');
  readonly status = input('');

  protected readonly statuses = EMPLOYMENT_STATUSES;
  protected readonly types = EMPLOYMENT_TYPES;

  protected readonly search = signal('');
  protected readonly deptFilter = linkedSignal(() => this.department());
  protected readonly statusFilter = linkedSignal(() => this.status());
  protected readonly typeFilter = signal('');
  protected readonly sort = signal<SortState<SortKey>>({ key: 'name', dir: 'asc' });
  protected readonly page = signal(1);
  protected readonly pageSize = signal(10);
  protected readonly view = signal<ViewMode>((localStorage.getItem(VIEW_KEY) as ViewMode) || 'table');

  protected readonly filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    const dept = this.deptFilter();
    const status = this.statusFilter();
    const type = this.typeFilter();
    const deptNames = this.departments.byId();

    const rows = this.employees.items().filter(
      (e) =>
        (!dept || e.departmentId === dept) &&
        (!status || e.status === status) &&
        (!type || e.employmentType === type) &&
        (!q ||
          `${e.firstName} ${e.lastName} ${e.email} ${e.code} ${e.designation}`.toLowerCase().includes(q)),
    );

    const { key, dir } = this.sort();
    const value = (e: Employee): string => {
      switch (key) {
        case 'name':
          return fullName(e);
        case 'department':
          return deptNames.get(e.departmentId)?.name ?? '';
        default:
          return String(e[key]);
      }
    };
    const factor = dir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => value(a).localeCompare(value(b)) * factor);
  });

  protected readonly paged = computed(() => {
    const start = (this.page() - 1) * this.pageSize();
    return this.filtered().slice(start, start + this.pageSize());
  });

  protected readonly hasFilters = computed(
    () => !!(this.search() || this.deptFilter() || this.statusFilter() || this.typeFilter()),
  );

  protected readonly counts = computed(() => {
    const all = this.employees.items();
    return {
      total: all.length,
      active: all.filter((e) => e.status === 'active').length,
      probation: all.filter((e) => e.status === 'probation').length,
      onLeave: all.filter((e) => e.status === 'on-leave').length,
    };
  });

  constructor() {
    this.employees.ensureLoaded();
    this.departments.ensureLoaded();

    // Any filter change returns to page 1
    effect(() => {
      this.search();
      this.deptFilter();
      this.statusFilter();
      this.typeFilter();
      this.page.set(1);
    });
    effect(() => localStorage.setItem(VIEW_KEY, this.view()));
  }

  protected deptName(id: string): string {
    return this.departments.nameOf(id);
  }

  protected toggleSort(key: SortKey): void {
    this.sort.update((s) => ({ key, dir: s.key === key && s.dir === 'asc' ? 'desc' : 'asc' }));
  }

  protected sortIcon(key: SortKey): string {
    const s = this.sort();
    if (s.key !== key) return 'bi-arrow-down-up opacity-25';
    return s.dir === 'asc' ? 'bi-sort-up' : 'bi-sort-down';
  }

  protected clearFilters(): void {
    this.search.set('');
    this.deptFilter.set('');
    this.statusFilter.set('');
    this.typeFilter.set('');
  }

  protected exportCsv(): void {
    const isManager = this.auth.isManager();
    downloadCsv(`employees-${new Date().toISOString().slice(0, 10)}`, this.filtered(), [
      { header: 'Employee ID', value: (e) => e.code },
      { header: 'First name', value: (e) => e.firstName },
      { header: 'Last name', value: (e) => e.lastName },
      { header: 'Email', value: (e) => e.email },
      { header: 'Phone', value: (e) => e.phone },
      { header: 'Department', value: (e) => this.deptName(e.departmentId) },
      { header: 'Designation', value: (e) => e.designation },
      { header: 'Type', value: (e) => e.employmentType },
      { header: 'Status', value: (e) => e.status },
      { header: 'Join date', value: (e) => e.joinDate },
      ...(isManager ? [{ header: 'Annual salary', value: (e: Employee) => e.salary }] : []),
    ]);
    this.toast.success(`Exported ${this.filtered().length} employees to CSV.`);
  }

  protected async remove(e: Employee): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'Delete employee',
      message: `Permanently delete ${fullName(e)} and all their attendance, leave and payroll records? This cannot be undone.`,
      confirmText: 'Delete',
      icon: 'bi-trash3',
    });
    if (!ok) return;
    this.employees.remove(e.id).subscribe(() => this.toast.success(`${fullName(e)} was deleted.`));
  }
}
