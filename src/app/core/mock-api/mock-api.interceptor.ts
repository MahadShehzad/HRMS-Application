import {
  HttpErrorResponse,
  HttpEvent,
  HttpInterceptorFn,
  HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, from, map, mergeMap, Observable, throwError, timer } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AttendanceRecord,
  AuthSession,
  Employee,
  Entity,
  LeaveRequest,
  Payslip,
  PayrollRunResult,
  Role,
  User,
  UserAccount,
} from '../models';
import { monthKey, todayIso, daysInMonth } from '../utils/date.utils';
import { uid } from '../utils/id.utils';
import { calculatePayslip } from '../utils/payroll.utils';
import { CollectionName, MockDb } from './mock-db';

/**
 * Mock REST backend.
 *
 * Intercepts every request to `environment.apiUrl` and serves it from the
 * in-browser {@link MockDb}, with simulated latency, auth and validation.
 * Remove this interceptor (or set `useMockApi: false`) to talk to a real API —
 * the feature services do not need to change.
 *
 *   POST   /auth/login                 → AuthSession
 *   POST   /auth/change-password
 *   POST   /payroll/run   {period}     → PayrollRunResult
 *   POST   /system/reset               → reseed demo data (admin)
 *   GET    /:collection?field=value&field_gte=..&field_lte=..
 *   GET    /:collection/:id
 *   POST   /:collection
 *   PATCH  /:collection/:id   (PUT also accepted)
 *   DELETE /:collection/:id
 */
export const mockApiInterceptor: HttpInterceptorFn = (req, next) => {
  if (!environment.useMockApi || !req.url.startsWith(environment.apiUrl)) {
    return next(req);
  }
  const db = inject(MockDb);
  return from(db.ready().then(() => handle(db, req))).pipe(
    mergeMap((body) => reply(body)),
    catchError((err: unknown) =>
      fail(req, err instanceof ApiError ? err : new ApiError(500, 'Unexpected server error')),
    ),
  );
};

// ---------------------------------------------------------------------------

class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

const ID_PREFIX: Record<CollectionName, string> = {
  employees: 'emp',
  departments: 'dep',
  attendance: 'att',
  leaves: 'lv',
  payslips: 'ps',
  jobs: 'job',
  candidates: 'cand',
  reviews: 'rev',
  announcements: 'ann',
  holidays: 'hol',
};

/** Collections only HR/admins may write to. */
const HR_WRITE: CollectionName[] = [
  'employees',
  'departments',
  'payslips',
  'jobs',
  'candidates',
  'reviews',
  'announcements',
  'holidays',
];

/** Collections where employees may only touch their own records. */
const SELF_SERVICE: CollectionName[] = ['attendance', 'leaves'];

function latency(): number {
  const { min, max } = environment.mockLatency;
  return Math.round(min + Math.random() * (max - min));
}

function reply(body: unknown): Observable<HttpEvent<unknown>> {
  const clone = body === undefined ? null : structuredClone(body);
  return timer(latency()).pipe(map(() => new HttpResponse({ status: 200, body: clone })));
}

function fail(req: HttpRequest<unknown>, err: ApiError): Observable<never> {
  return timer(latency()).pipe(
    mergeMap(() =>
      throwError(
        () =>
          new HttpErrorResponse({
            status: err.status,
            statusText: err.message,
            url: req.url,
            error: { message: err.message },
          }),
      ),
    ),
  );
}

// ---- Auth helpers -----------------------------------------------------------

function issueToken(user: User, ttlMs: number): AuthSession {
  const expiresAt = Date.now() + ttlMs;
  return { token: `mock.${btoa(user.id)}.${expiresAt}`, user, expiresAt };
}

function currentUser(db: MockDb, req: HttpRequest<unknown>): UserAccount {
  const header = req.headers.get('Authorization') ?? '';
  const [, payload, exp] = header.replace(/^Bearer\s+/i, '').split('.');
  if (!payload || Number(exp) < Date.now()) throw new ApiError(401, 'Your session has expired');
  let id = '';
  try {
    id = atob(payload);
  } catch {
    throw new ApiError(401, 'Invalid session');
  }
  const user = db.data.users.find((u) => u.id === id);
  if (!user) throw new ApiError(401, 'Invalid session');
  return user;
}

const isHr = (role: Role) => role === 'admin' || role === 'hr';

function stripPassword({ password: _pw, ...user }: UserAccount): User {
  return user;
}

// ---- Router -----------------------------------------------------------------

async function handle(db: MockDb, req: HttpRequest<unknown>): Promise<unknown> {
  const path = req.url
    .slice(environment.apiUrl.length)
    .split('?')[0]
    .replace(/^\/+|\/+$/g, '');
  const [resource, id, ...rest] = path.split('/');
  const body = (req.body ?? {}) as Record<string, unknown>;

  if (resource === 'auth' && id === 'login' && req.method === 'POST') {
    const email = String(body['email'] ?? '').trim().toLowerCase();
    const user = db.data.users.find((u) => u.email.toLowerCase() === email);
    if (!user || user.password !== body['password']) {
      throw new ApiError(401, 'Invalid email or password');
    }
    const ttl = body['remember'] ? 30 * 86_400_000 : 8 * 3_600_000;
    return issueToken(stripPassword(user), ttl);
  }

  const user = currentUser(db, req);

  if (resource === 'auth' && id === 'change-password' && req.method === 'POST') {
    if (user.password !== body['currentPassword']) {
      throw new ApiError(400, 'Current password is incorrect');
    }
    user.password = String(body['newPassword']);
    db.persist();
    return { ok: true };
  }

  if (resource === 'system' && id === 'reset' && req.method === 'POST') {
    if (user.role !== 'admin') throw new ApiError(403, 'Only administrators can reset data');
    await db.reset();
    return { ok: true };
  }

  if (resource === 'payroll' && id === 'run' && req.method === 'POST') {
    if (!isHr(user.role)) throw new ApiError(403, 'Not allowed');
    return runPayroll(db, String(body['period']));
  }

  if (!db.isCollection(resource) || rest.length) {
    throw new ApiError(404, `Unknown endpoint: ${req.method} /${path}`);
  }

  return handleCollection(db, req, resource, id, user);
}

function handleCollection(
  db: MockDb,
  req: HttpRequest<unknown>,
  name: CollectionName,
  id: string | undefined,
  user: UserAccount,
): unknown {
  const items = db.collection<Entity & Record<string, unknown>>(name);
  const isWrite = req.method !== 'GET';

  if (isWrite && HR_WRITE.includes(name) && !isHr(user.role) && !isAllowedSelfEdit(name, req, items, id, user)) {
    throw new ApiError(403, 'You do not have permission to perform this action');
  }

  const assertOwnRecord = (record: Record<string, unknown>) => {
    if (SELF_SERVICE.includes(name) && !isHr(user.role) && record['employeeId'] !== user.employeeId) {
      throw new ApiError(403, 'You can only modify your own records');
    }
  };

  switch (req.method) {
    case 'GET': {
      if (id) {
        const found = items.find((i) => i.id === id);
        if (!found) throw new ApiError(404, 'Record not found');
        return found;
      }
      return filterByParams(items, req);
    }

    case 'POST': {
      const record = { ...(req.body as object), id: uid(ID_PREFIX[name]) } as Entity &
        Record<string, unknown>;
      assertOwnRecord(record);
      validate(db, name, record);
      if (name === 'employees') {
        const max = Math.max(0, ...db.data.employees.map((e) => Number(e.code.split('-')[1]) || 0));
        record['code'] = `EMP-${String(max + 1).padStart(4, '0')}`;
      }
      items.unshift(record);
      db.persist();
      return record;
    }

    case 'PUT':
    case 'PATCH': {
      const idx = items.findIndex((i) => i.id === id);
      if (idx < 0) throw new ApiError(404, 'Record not found');
      assertOwnRecord(items[idx]);
      const updated = { ...items[idx], ...(req.body as object), id: items[idx].id };
      validate(db, name, updated);
      items[idx] = updated;
      db.persist();
      return updated;
    }

    case 'DELETE': {
      const idx = items.findIndex((i) => i.id === id);
      if (idx < 0) throw new ApiError(404, 'Record not found');
      assertOwnRecord(items[idx]);
      beforeDelete(db, name, id!);
      items.splice(idx, 1);
      db.persist();
      return { ok: true };
    }
  }
  throw new ApiError(405, 'Method not allowed');
}

/** Fields employees may change on their own profile. */
const SELF_PROFILE_FIELDS = ['phone', 'address', 'city', 'country', 'emergencyContact'];

/**
 * Narrow self-service exceptions to HR-only collections:
 *  - an employee may update contact details on their own profile
 *  - an employee may acknowledge their own performance review
 */
function isAllowedSelfEdit(
  name: CollectionName,
  req: HttpRequest<unknown>,
  items: (Entity & Record<string, unknown>)[],
  id: string | undefined,
  user: UserAccount,
): boolean {
  if (req.method !== 'PATCH' || !id) return false;
  const body = (req.body ?? {}) as Record<string, unknown>;
  const keys = Object.keys(body);
  const record = items.find((i) => i.id === id);
  if (name === 'employees') {
    return id === user.employeeId && keys.length > 0 && keys.every((k) => SELF_PROFILE_FIELDS.includes(k));
  }
  if (name === 'reviews') {
    return record?.['employeeId'] === user.employeeId && keys.length === 1 && body['status'] === 'acknowledged';
  }
  return false;
}

/** json-server-style filtering: `?field=value`, `?field_gte=x`, `?field_lte=y`. */
function filterByParams<T extends Record<string, unknown>>(items: T[], req: HttpRequest<unknown>): T[] {
  const params = req.params;
  const keys = params.keys();
  if (!keys.length) return items;
  return items.filter((item) =>
    keys.every((key) => {
      const value = params.get(key)!;
      if (key.endsWith('_gte')) return String(item[key.slice(0, -4)]) >= value;
      if (key.endsWith('_lte')) return String(item[key.slice(0, -4)]) <= value;
      return String(item[key]) === value;
    }),
  );
}

function validate(db: MockDb, name: CollectionName, record: Record<string, unknown>): void {
  if (name === 'employees') {
    const email = String(record['email'] ?? '').toLowerCase();
    const clash = db.data.employees.find(
      (e) => e.email.toLowerCase() === email && e.id !== record['id'],
    );
    if (clash) throw new ApiError(409, `Email ${email} is already used by ${clash.firstName} ${clash.lastName}`);
  }
  if (name === 'departments') {
    const code = String(record['code'] ?? '').toUpperCase();
    if (db.data.departments.some((d) => d.code.toUpperCase() === code && d.id !== record['id'])) {
      throw new ApiError(409, `Department code ${code} already exists`);
    }
  }
  if (name === 'leaves' && record['status'] === 'pending') {
    const l = record as unknown as LeaveRequest;
    const overlap = db.data.leaves.some(
      (o) =>
        o.id !== l.id &&
        o.employeeId === l.employeeId &&
        (o.status === 'pending' || o.status === 'approved') &&
        o.startDate <= l.endDate &&
        o.endDate >= l.startDate,
    );
    if (overlap) throw new ApiError(409, 'This request overlaps with an existing leave request');
  }
}

function beforeDelete(db: MockDb, name: CollectionName, id: string): void {
  const d = db.data;
  if (name === 'departments' && d.employees.some((e) => e.departmentId === id && e.status !== 'terminated')) {
    throw new ApiError(409, 'Move or remove this department’s employees before deleting it');
  }
  if (name === 'employees') {
    if (d.users.some((u) => u.employeeId === id)) {
      throw new ApiError(409, 'This employee has a login account and cannot be deleted');
    }
    d.attendance = d.attendance.filter((r) => r.employeeId !== id);
    d.leaves = d.leaves.filter((r) => r.employeeId !== id);
    d.payslips = d.payslips.filter((r) => r.employeeId !== id);
    d.reviews = d.reviews.filter((r) => r.employeeId !== id);
    d.departments.forEach((dep) => dep.headId === id && (dep.headId = null));
    d.employees.forEach((e) => e.managerId === id && (e.managerId = null));
  }
  if (name === 'jobs') {
    d.candidates = d.candidates.filter((c) => c.jobId !== id);
  }
}

function runPayroll(db: MockDb, period: string): PayrollRunResult {
  if (!/^\d{4}-\d{2}$/.test(period)) throw new ApiError(400, 'Invalid payroll period');
  if (period > monthKey(new Date())) throw new ApiError(400, 'Cannot run payroll for a future month');

  const d = db.data;
  const periodEnd = `${period}-${String(daysInMonth(period)).padStart(2, '0')}`;
  const existing = new Set(d.payslips.filter((p) => p.period === period).map((p) => p.employeeId));
  let created = 0;
  let skipped = 0;

  const eligible = d.employees.filter((e: Employee) => e.status !== 'terminated' && e.joinDate <= periodEnd);
  for (const employee of eligible) {
    if (existing.has(employee.id)) {
      skipped++;
      continue;
    }
    const records = d.attendance.filter(
      (a: AttendanceRecord) => a.employeeId === employee.id && a.date.startsWith(period),
    );
    const overtimeHours = Math.round(records.reduce((s, a) => s + Math.max(0, a.hours - 9), 0));
    const unpaidDays = d.leaves
      .filter((l) => l.employeeId === employee.id && l.type === 'unpaid' && l.status === 'approved' && l.startDate.startsWith(period))
      .reduce((s, l) => s + l.days, 0);

    const slip: Payslip = {
      id: uid('ps'),
      ...calculatePayslip({ employee, period, overtimeHours, unpaidDays }),
      status: 'processed',
      generatedOn: todayIso(),
    };
    d.payslips.unshift(slip);
    created++;
  }
  db.persist();
  return { period, created, skipped };
}
