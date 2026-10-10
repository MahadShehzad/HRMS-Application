import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { DepartmentService, EmployeeService, LeaveService } from '../../core/data';
import { LEAVE_TYPES } from '../../core/models';
import { ToastService } from '../../core/services/toast.service';
import { downloadCsv } from '../../core/utils/csv.utils';
import { parseIsoDate } from '../../core/utils/date.utils';
import {
  BarListChart,
  ChartDatum,
  ColumnChart,
  compactFormat,
  DonutChart,
  PageHeader,
  Skeleton,
  StatCard,
  toLabel,
} from '../../shared';

const YEAR_MS = 365.25 * 86_400_000;

@Component({
  selector: 'app-reports-page',
  imports: [PageHeader, StatCard, BarListChart, ColumnChart, DonutChart, Skeleton],
  templateUrl: './reports-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class ReportsPage {
  private readonly employees = inject(EmployeeService);
  private readonly departments = inject(DepartmentService);
  private readonly leaves = inject(LeaveService);
  private readonly toast = inject(ToastService);

  protected readonly loaded = computed(
    () => this.employees.loaded() && this.departments.loaded() && this.leaves.loaded(),
  );
  protected readonly year = new Date().getFullYear();
  protected readonly usdCompact = (v: number) => '$' + compactFormat(v);
  protected readonly days = (v: number) => `${v} days`;

  private readonly workforce = this.employees.workforce;

  protected readonly kpis = computed(() => {
    const all = this.employees.items();
    const active = this.workforce();
    const year = String(this.year);
    const now = Date.now();
    const leavers = all.filter((e) => e.status === 'terminated').length;
    const tenure = active.reduce((s, e) => s + (now - parseIsoDate(e.joinDate).getTime()) / YEAR_MS, 0);
    return {
      headcount: active.length,
      hires: all.filter((e) => e.joinDate.startsWith(year)).length,
      attrition: all.length ? (leavers / all.length) * 100 : 0,
      avgTenure: active.length ? tenure / active.length : 0,
      payroll: active.reduce((s, e) => s + e.salary, 0),
    };
  });

  protected readonly headcountByDept = computed<ChartDatum[]>(() =>
    this.departments.items().map((d) => ({
      label: d.name,
      value: this.workforce().filter((e) => e.departmentId === d.id).length,
    })),
  );

  protected readonly salaryByDept = computed<ChartDatum[]>(() =>
    this.departments.items().map((d) => ({
      label: d.name,
      value: this.workforce()
        .filter((e) => e.departmentId === d.id)
        .reduce((s, e) => s + e.salary, 0),
    })),
  );

  protected readonly gender = computed<ChartDatum[]>(() =>
    (['female', 'male', 'other'] as const).map((g) => ({
      label: toLabel(g),
      value: this.workforce().filter((e) => e.gender === g).length,
    })),
  );

  protected readonly tenure = computed<ChartDatum[]>(() => {
    const buckets = [
      { label: '< 1 yr', max: 1 },
      { label: '1–2 yrs', max: 2 },
      { label: '2–3 yrs', max: 3 },
      { label: '3–5 yrs', max: 5 },
      { label: '5+ yrs', max: Infinity },
    ];
    const now = Date.now();
    const counts = buckets.map(() => 0);
    for (const e of this.workforce()) {
      const yrs = (now - parseIsoDate(e.joinDate).getTime()) / YEAR_MS;
      counts[buckets.findIndex((b) => yrs < b.max)]++;
    }
    return buckets.map((b, i) => ({ label: b.label, value: counts[i] }));
  });

  protected readonly leaveByType = computed<ChartDatum[]>(() => {
    const approved = this.leaves
      .items()
      .filter((l) => l.status === 'approved' && l.startDate.startsWith(String(this.year)));
    return LEAVE_TYPES.map((t) => ({
      label: t.label,
      value: approved.filter((l) => l.type === t.type).reduce((s, l) => s + l.days, 0),
    }));
  });

  constructor() {
    this.employees.ensureLoaded();
    this.departments.ensureLoaded();
    this.leaves.ensureLoaded();
  }

  protected export(name: string, data: ChartDatum[], valueHeader: string): void {
    downloadCsv(`${name}-${this.year}`, data, [
      { header: 'Category', value: (d) => d.label },
      { header: valueHeader, value: (d) => d.value },
    ]);
    this.toast.success(`Exported ${name.replace(/-/g, ' ')}.`);
  }

  protected exportHeadcountReport(): void {
    const depts = this.departments.items();
    downloadCsv(`headcount-report-${this.year}`, depts, [
      { header: 'Department', value: (d) => d.name },
      { header: 'Code', value: (d) => d.code },
      { header: 'Headcount', value: (d) => this.workforce().filter((e) => e.departmentId === d.id).length },
      { header: 'Annual salary cost', value: (d) => this.workforce().filter((e) => e.departmentId === d.id).reduce((s, e) => s + e.salary, 0) },
      { header: 'Budget', value: (d) => d.budget },
      { header: 'Location', value: (d) => d.location },
    ]);
    this.toast.success('Headcount report exported.');
  }
}
