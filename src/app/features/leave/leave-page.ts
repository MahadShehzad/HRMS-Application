import { DatePipe, LowerCasePipe } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  linkedSignal,
  signal,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { DepartmentService, EmployeeService, LeaveService } from '../../core/data';
import { LEAVE_TYPES, LeaveRequest, LeaveStatus, LeaveType } from '../../core/models';
import { ConfirmService } from '../../core/services/confirm.service';
import { ToastService } from '../../core/services/toast.service';
import { downloadCsv } from '../../core/utils/csv.utils';
import { nextWorkingDay, todayIso, workingDaysBetween } from '../../core/utils/date.utils';
import {
  Avatar,
  EmptyState,
  Modal,
  PageHeader,
  RelativeDatePipe,
  Skeleton,
  StatusBadge,
} from '../../shared';

type Tab = 'my' | 'approvals' | 'all';

@Component({
  selector: 'app-leave-page',
  imports: [
    RouterLink,
    DatePipe,
    LowerCasePipe,
    ReactiveFormsModule,
    PageHeader,
    StatusBadge,
    Avatar,
    Skeleton,
    EmptyState,
    Modal,
    RelativeDatePipe,
  ],
  templateUrl: './leave-page.html',
  styleUrl: './leave-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class LeavePage {
  protected readonly auth = inject(AuthService);
  protected readonly leaves = inject(LeaveService);
  protected readonly employees = inject(EmployeeService);
  private readonly departments = inject(DepartmentService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  private readonly applyModal = viewChild.required<Modal>('applyModal');
  private readonly reviewModal = viewChild.required<Modal>('reviewModal');

  /** `?tab=approvals` and `?apply=1` deep links */
  readonly tabParam = input<string>('', { alias: 'tab' });
  readonly apply = input<string>('');

  protected readonly leaveTypes = LEAVE_TYPES;
  protected readonly tab = linkedSignal<Tab>(() => {
    const t = this.tabParam() as Tab;
    return this.auth.isManager() && (t === 'approvals' || t === 'all') ? t : 'my';
  });

  private readonly myId = computed(() => this.auth.user()?.employeeId ?? '');
  protected readonly balances = computed(() => this.leaves.balances(this.myId()));
  protected readonly myRequests = computed(() => this.leaves.forEmployee(this.myId()));

  // ---- All requests filters -------------------------------------------------
  protected readonly statusFilter = signal<LeaveStatus | ''>('');
  protected readonly typeFilter = signal<LeaveType | ''>('');
  protected readonly search = signal('');
  protected readonly allRequests = computed(() => {
    const q = this.search().trim().toLowerCase();
    return [...this.leaves.items()]
      .filter(
        (l) =>
          (!this.statusFilter() || l.status === this.statusFilter()) &&
          (!this.typeFilter() || l.type === this.typeFilter()) &&
          (!q || this.nameOf(l.employeeId).toLowerCase().includes(q)),
      )
      .sort((a, b) => b.appliedOn.localeCompare(a.appliedOn));
  });

  // ---- Apply form -----------------------------------------------------------
  protected readonly submitting = signal(false);
  protected readonly applyForm = inject(FormBuilder).nonNullable.group({
    type: ['annual' as LeaveType, Validators.required],
    startDate: [nextWorkingDay(), Validators.required],
    endDate: [nextWorkingDay(), Validators.required],
    reason: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(300)]],
  });
  private readonly formValue = toSignal(this.applyForm.valueChanges, { initialValue: this.applyForm.getRawValue() });

  protected readonly requestedDays = computed(() => {
    const v = this.formValue();
    return workingDaysBetween(v.startDate ?? '', v.endDate ?? '');
  });
  protected readonly selectedBalance = computed(() =>
    this.balances().find((b) => b.config.type === this.formValue().type),
  );
  protected readonly applyError = computed(() => {
    const v = this.formValue();
    if (!v.startDate || !v.endDate) return '';
    if (v.endDate < v.startDate) return 'End date must be on or after the start date.';
    if (v.type !== 'sick' && v.startDate < todayIso()) return 'Only sick leave can be backdated.';
    if (this.requestedDays() === 0) return 'The selected range contains no working days.';
    const remaining = this.selectedBalance()?.remaining;
    if (remaining !== null && remaining !== undefined && this.requestedDays() > remaining) {
      return `Only ${remaining} day(s) of ${v.type} leave remaining.`;
    }
    return '';
  });

  // ---- Review ---------------------------------------------------------------
  protected readonly reviewing = signal<LeaveRequest | null>(null);
  protected readonly reviewNote = signal('');
  protected readonly busyId = signal<string | null>(null);

  constructor() {
    this.leaves.ensureLoaded();
    this.employees.ensureLoaded();
    this.departments.ensureLoaded();
    afterNextRender(() => {
      if (this.apply()) this.openApply();
    });
  }

  protected nameOf(id: string): string {
    return this.employees.nameOf(id);
  }

  protected deptOf(employeeId: string): string {
    return this.departments.nameOf(this.employees.byId().get(employeeId)?.departmentId);
  }

  protected typeLabel(type: LeaveType): string {
    return LEAVE_TYPES.find((t) => t.type === type)?.label ?? type;
  }

  protected balanceFor(employeeId: string, type: LeaveType) {
    return this.leaves.balances(employeeId).find((b) => b.config.type === type);
  }

  protected openApply(): void {
    const day = nextWorkingDay();
    this.applyForm.reset({ type: 'annual', startDate: day, endDate: day, reason: '' });
    this.applyModal().open();
  }

  protected submitApply(): void {
    if (this.applyForm.invalid || this.applyError()) {
      this.applyForm.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.leaves.apply({ employeeId: this.myId(), ...this.applyForm.getRawValue() }).subscribe({
      next: (l) => {
        this.submitting.set(false);
        this.applyModal().close();
        this.tab.set('my');
        this.toast.success(`Your ${l.days}-day ${l.type} leave request was submitted for approval.`);
      },
      error: () => this.submitting.set(false),
    });
  }

  protected async cancel(l: LeaveRequest): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'Cancel leave request',
      message: `Cancel your ${l.type} leave from ${l.startDate} to ${l.endDate}?`,
      confirmText: 'Cancel request',
      cancelText: 'Keep it',
      tone: 'warning',
    });
    if (ok) this.leaves.cancel(l.id).subscribe(() => this.toast.info('Leave request cancelled.'));
  }

  protected openReview(l: LeaveRequest): void {
    this.reviewing.set(l);
    this.reviewNote.set('');
    this.reviewModal().open();
  }

  protected decide(l: LeaveRequest, status: 'approved' | 'rejected', note = ''): void {
    this.busyId.set(l.id);
    this.leaves.review(l.id, status, this.myId(), note).subscribe({
      next: () => {
        this.busyId.set(null);
        if (this.reviewing()?.id === l.id) this.reviewModal().close();
        this.toast.success(`Request from ${this.nameOf(l.employeeId)} ${status}.`);
      },
      error: () => this.busyId.set(null),
    });
  }

  protected exportAll(): void {
    downloadCsv('leave-requests', this.allRequests(), [
      { header: 'Employee', value: (l) => this.nameOf(l.employeeId) },
      { header: 'Department', value: (l) => this.deptOf(l.employeeId) },
      { header: 'Type', value: (l) => l.type },
      { header: 'Start', value: (l) => l.startDate },
      { header: 'End', value: (l) => l.endDate },
      { header: 'Days', value: (l) => l.days },
      { header: 'Status', value: (l) => l.status },
      { header: 'Applied on', value: (l) => l.appliedOn },
      { header: 'Reason', value: (l) => l.reason },
    ]);
  }
}
