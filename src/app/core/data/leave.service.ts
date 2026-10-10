import { computed, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  IsoDate,
  LEAVE_TYPES,
  LeaveBalance,
  LeaveRequest,
  LeaveStatus,
  LeaveType,
} from '../models';
import { todayIso, workingDaysBetween } from '../utils/date.utils';
import { EntityStore } from './entity-store';

export interface LeaveApplication {
  employeeId: string;
  type: LeaveType;
  startDate: IsoDate;
  endDate: IsoDate;
  reason: string;
}

@Injectable({ providedIn: 'root' })
export class LeaveService extends EntityStore<LeaveRequest> {
  protected readonly resource = 'leaves';

  readonly pending = computed(() =>
    this.items()
      .filter((l) => l.status === 'pending')
      .sort((a, b) => a.startDate.localeCompare(b.startDate)),
  );

  /** Approved leave covering the given date (who is out today). */
  onLeaveOn(date: IsoDate = todayIso()): LeaveRequest[] {
    return this.items().filter(
      (l) => l.status === 'approved' && l.startDate <= date && l.endDate >= date,
    );
  }

  forEmployee(employeeId: string): LeaveRequest[] {
    return this.items()
      .filter((l) => l.employeeId === employeeId)
      .sort((a, b) => b.startDate.localeCompare(a.startDate));
  }

  balances(employeeId: string, year = new Date().getFullYear()): LeaveBalance[] {
    const mine = this.items().filter(
      (l) => l.employeeId === employeeId && l.startDate.startsWith(String(year)),
    );
    return LEAVE_TYPES.map((config) => {
      const ofType = mine.filter((l) => l.type === config.type);
      const used = ofType.filter((l) => l.status === 'approved').reduce((s, l) => s + l.days, 0);
      const pending = ofType.filter((l) => l.status === 'pending').reduce((s, l) => s + l.days, 0);
      return {
        config,
        used,
        pending,
        remaining: config.entitlement === null ? null : Math.max(0, config.entitlement - used - pending),
      };
    });
  }

  apply(application: LeaveApplication): Observable<LeaveRequest> {
    return this.create({
      ...application,
      days: workingDaysBetween(application.startDate, application.endDate),
      status: 'pending',
      appliedOn: todayIso(),
    });
  }

  review(id: string, status: Extract<LeaveStatus, 'approved' | 'rejected'>, reviewerId: string, note = '') {
    return this.update(id, { status, reviewedBy: reviewerId, reviewedOn: todayIso(), reviewNote: note });
  }

  cancel(id: string) {
    return this.update(id, { status: 'cancelled' });
  }
}
