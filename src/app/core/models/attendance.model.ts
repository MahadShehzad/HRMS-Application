import { Entity, IsoDate } from './common.model';

export type AttendanceStatus = 'present' | 'late' | 'half-day' | 'remote' | 'absent' | 'on-leave';

export const ATTENDANCE_STATUSES: AttendanceStatus[] = [
  'present',
  'late',
  'half-day',
  'remote',
  'absent',
  'on-leave',
];

export interface AttendanceRecord extends Entity {
  employeeId: string;
  date: IsoDate;
  /** `HH:mm`, null when not clocked in. */
  checkIn: string | null;
  checkOut: string | null;
  status: AttendanceStatus;
  /** Worked hours, derived from check-in/out. */
  hours: number;
  note?: string;
}
