import { Injectable } from '@angular/core';
import { Observable, switchMap, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Payslip, PayrollRunResult } from '../models';
import { todayIso } from '../utils/date.utils';
import { EntityStore } from './entity-store';

@Injectable({ providedIn: 'root' })
export class PayrollService extends EntityStore<Payslip> {
  protected readonly resource = 'payslips';

  forPeriod(period: string): Payslip[] {
    return this.items().filter((p) => p.period === period);
  }

  forEmployee(employeeId: string): Payslip[] {
    return this.items()
      .filter((p) => p.employeeId === employeeId)
      .sort((a, b) => b.period.localeCompare(a.period));
  }

  /** Generates payslips for every eligible employee, then refreshes the cache. */
  run(period: string): Observable<PayrollRunResult> {
    return this.http
      .post<PayrollRunResult>(`${environment.apiUrl}/payroll/run`, { period })
      .pipe(switchMap((result) => this.load(true).pipe(map(() => result))));
  }

  markPaid(slip: Payslip): Observable<Payslip> {
    return this.update(slip.id, { status: 'paid', paidOn: todayIso() });
  }
}
