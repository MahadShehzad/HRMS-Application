import { Entity, IsoDate } from './common.model';

export type LeaveType = 'annual' | 'sick' | 'casual' | 'parental' | 'unpaid';
export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface LeaveTypeConfig {
  type: LeaveType;
  label: string;
  /** Days allowed per calendar year; `null` = unlimited. */
  entitlement: number | null;
  icon: string;
  tone: 'primary' | 'danger' | 'info' | 'success' | 'secondary';
}

export const LEAVE_TYPES: LeaveTypeConfig[] = [
  { type: 'annual', label: 'Annual', entitlement: 20, icon: 'bi-sun', tone: 'primary' },
  { type: 'sick', label: 'Sick', entitlement: 10, icon: 'bi-thermometer-half', tone: 'danger' },
  { type: 'casual', label: 'Casual', entitlement: 6, icon: 'bi-cup-hot', tone: 'info' },
  { type: 'parental', label: 'Parental', entitlement: 30, icon: 'bi-balloon-heart', tone: 'success' },
  { type: 'unpaid', label: 'Unpaid', entitlement: null, icon: 'bi-wallet2', tone: 'secondary' },
];

export interface LeaveRequest extends Entity {
  employeeId: string;
  type: LeaveType;
  startDate: IsoDate;
  endDate: IsoDate;
  /** Working days (weekends excluded). */
  days: number;
  reason: string;
  status: LeaveStatus;
  appliedOn: IsoDate;
  reviewedBy?: string;
  reviewedOn?: IsoDate;
  reviewNote?: string;
}

export interface LeaveBalance {
  config: LeaveTypeConfig;
  used: number;
  pending: number;
  /** `null` when unlimited. */
  remaining: number | null;
}
