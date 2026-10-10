import { Employee, Payslip, PayslipDeductions, PayslipEarnings } from '../models';
import { workingDaysInMonth } from './date.utils';

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Progressive monthly income-tax bands (illustrative). */
const TAX_BANDS: { upTo: number; rate: number }[] = [
  { upTo: 1_000, rate: 0 },
  { upTo: 4_000, rate: 0.1 },
  { upTo: 8_000, rate: 0.2 },
  { upTo: Infinity, rate: 0.3 },
];

export function monthlyTax(taxable: number): number {
  let tax = 0;
  let lower = 0;
  for (const band of TAX_BANDS) {
    if (taxable <= lower) break;
    tax += (Math.min(taxable, band.upTo) - lower) * band.rate;
    lower = band.upTo;
  }
  return round2(tax);
}

export interface PayslipInput {
  employee: Employee;
  period: string;
  /** Unpaid leave days in the period. */
  unpaidDays?: number;
  overtimeHours?: number;
  bonus?: number;
}

/** Builds a fully calculated payslip (without id/status metadata). */
export function calculatePayslip(
  input: PayslipInput,
): Omit<Payslip, 'id' | 'status' | 'generatedOn' | 'paidOn'> {
  const { employee, period, unpaidDays = 0, overtimeHours = 0, bonus = 0 } = input;
  const workingDays = workingDaysInMonth(period);
  const paidDays = Math.max(0, workingDays - unpaidDays);
  const monthly = employee.salary / 12;
  const ratio = paidDays / workingDays;

  const earnings: PayslipEarnings = {
    basic: round2(monthly * 0.7 * ratio),
    housing: round2(monthly * 0.2 * ratio),
    transport: round2(monthly * 0.1 * ratio),
    overtime: round2(overtimeHours * ((monthly / workingDays / 8) * 1.5)),
    bonus: round2(bonus),
  };
  const gross = round2(Object.values(earnings).reduce((a, b) => a + b, 0));

  const pension = round2(earnings.basic * 0.05);
  const deductions: PayslipDeductions = {
    tax: monthlyTax(gross - pension),
    pension,
    insurance: 45,
    other: 0,
  };
  const totalDeductions = round2(Object.values(deductions).reduce((a, b) => a + b, 0));

  return {
    employeeId: employee.id,
    period,
    earnings,
    deductions,
    gross,
    totalDeductions,
    net: round2(gross - totalDeductions),
    workingDays,
    paidDays,
  };
}
