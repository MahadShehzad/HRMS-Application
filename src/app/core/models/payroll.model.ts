import { Entity, IsoDate } from './common.model';

export type PayslipStatus = 'draft' | 'processed' | 'paid';

export interface PayslipEarnings {
  basic: number;
  housing: number;
  transport: number;
  overtime: number;
  bonus: number;
}

export interface PayslipDeductions {
  tax: number;
  pension: number;
  insurance: number;
  other: number;
}

export interface Payslip extends Entity {
  employeeId: string;
  /** `YYYY-MM` */
  period: string;
  earnings: PayslipEarnings;
  deductions: PayslipDeductions;
  gross: number;
  totalDeductions: number;
  net: number;
  workingDays: number;
  paidDays: number;
  status: PayslipStatus;
  generatedOn: IsoDate;
  paidOn?: IsoDate;
}

export interface PayrollRunRequest {
  period: string;
}

export interface PayrollRunResult {
  period: string;
  created: number;
  skipped: number;
}
