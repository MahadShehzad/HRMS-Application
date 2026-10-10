import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AttendanceRecord, AttendanceStatus, IsoDate } from '../models';
import { currentTime, minutesBetween, todayIso } from '../utils/date.utils';
import { EntityStore } from './entity-store';

/** Shift start; clocking in after the grace period marks the day as late. */
export const SHIFT_START = '09:00';
export const LATE_AFTER = '09:15';

/**
 * Attendance is the largest collection, so screens use filtered `query()`
 * calls (by date or employee) instead of loading everything.
 */
@Injectable({ providedIn: 'root' })
export class AttendanceService extends EntityStore<AttendanceRecord> {
  protected readonly resource = 'attendance';

  forDate(date: IsoDate): Observable<AttendanceRecord[]> {
    return this.query({ date });
  }

  forRange(from: IsoDate, to: IsoDate, employeeId?: string): Observable<AttendanceRecord[]> {
    return this.query({
      date_gte: from,
      date_lte: to,
      ...(employeeId ? { employeeId } : {}),
    });
  }

  clockIn(employeeId: string, remote = false): Observable<AttendanceRecord> {
    const now = currentTime();
    const status: AttendanceStatus = remote ? 'remote' : now > LATE_AFTER ? 'late' : 'present';
    return this.create({
      employeeId,
      date: todayIso(),
      checkIn: now,
      checkOut: null,
      status,
      hours: 0,
    });
  }

  clockOut(record: AttendanceRecord): Observable<AttendanceRecord> {
    const out = currentTime();
    const hours = record.checkIn ? Math.max(0, minutesBetween(record.checkIn, out) / 60) : 0;
    return this.update(record.id, {
      checkOut: out,
      hours: Math.round(hours * 100) / 100,
      status: hours > 0 && hours < 4.5 && record.status !== 'remote' ? 'half-day' : record.status,
    });
  }
}
