import {
  Announcement,
  AttendanceRecord,
  AttendanceStatus,
  Candidate,
  CandidateStage,
  Department,
  Employee,
  EmploymentStatus,
  EmploymentType,
  Gender,
  Holiday,
  JobOpening,
  LeaveRequest,
  LeaveStatus,
  LeaveType,
  Payslip,
  PerformanceReview,
  UserAccount,
} from '../models';
import {
  addDays,
  isWeekend,
  monthKey,
  parseIsoDate,
  quarterKey,
  shiftMonth,
  toIsoDate,
  todayIso,
  workingDaysBetween,
} from '../utils/date.utils';
import { calculatePayslip } from '../utils/payroll.utils';

/** Full in-memory database shape used by the mock API. */
export interface MockDatabase {
  version: number;
  seededOn: string;
  users: UserAccount[];
  employees: Employee[];
  departments: Department[];
  attendance: AttendanceRecord[];
  leaves: LeaveRequest[];
  payslips: Payslip[];
  jobs: JobOpening[];
  candidates: Candidate[];
  reviews: PerformanceReview[];
  announcements: Announcement[];
  holidays: Holiday[];
}

// ---------------------------------------------------------------------------
// Deterministic PRNG so every fresh install gets the same believable dataset
// ---------------------------------------------------------------------------
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MALE_NAMES = ['James', 'Daniel', 'Omar', 'Lucas', 'Ethan', 'Ryan', 'Hassan', 'Marco', 'Noah', 'Leo', 'Adrian', 'Samuel', 'Kenji', 'Mateo', 'Victor', 'Bilal', 'Arjun', 'Felix', 'Owen', 'Hugo'];
const FEMALE_NAMES = ['Emma', 'Olivia', 'Sofia', 'Fatima', 'Mia', 'Hannah', 'Chloe', 'Zara', 'Yuki', 'Laura', 'Isabel', 'Nadia', 'Grace', 'Priya', 'Elena', 'Maya', 'Leah', 'Amara', 'Ines', 'Ruby'];
const LAST_NAMES = ['Anderson', 'Rahman', 'Garcia', 'Okafor', 'Nguyen', 'Müller', 'Rossi', 'Tanaka', 'Silva', 'Novak', 'Patel', 'Johnson', 'Kowalski', 'Haddad', 'Larsen', 'Moreau', 'Kim', 'Bennett', 'Costa', 'Ibrahim', 'Walsh', 'Fischer', 'Reyes', 'Malik', 'Turner', 'Sato', 'Park', 'Dubois'];
const CITIES: [string, string][] = [['New York', 'USA'], ['Austin', 'USA'], ['Toronto', 'Canada'], ['London', 'UK'], ['Berlin', 'Germany'], ['Dubai', 'UAE'], ['Lahore', 'Pakistan'], ['Singapore', 'Singapore']];
const OFFICE_CITY: Record<string, [string, string]> = {
  'New York HQ': ['New York', 'USA'],
  'Austin Office': ['Austin', 'USA'],
  'London Office': ['London', 'UK'],
  'Toronto Office': ['Toronto', 'Canada'],
};
const STREETS = ['Maple Ave', 'Oak Street', 'Cedar Lane', 'Park Road', 'Hill Crescent', 'River Drive', 'King Street', 'Elm Court'];
const SKILLS: Record<string, string[]> = {
  ENG: ['TypeScript', 'Angular', 'Node.js', 'PostgreSQL', 'AWS', 'Docker', 'Go', 'Kubernetes'],
  PRD: ['Roadmapping', 'Analytics', 'User research', 'Jira', 'SQL'],
  DES: ['Figma', 'Prototyping', 'Design systems', 'Illustration', 'UX writing'],
  MKT: ['SEO', 'Content', 'Paid ads', 'HubSpot', 'Copywriting'],
  SAL: ['Negotiation', 'Salesforce', 'Prospecting', 'Account mgmt'],
  HR: ['Recruiting', 'Labour law', 'Onboarding', 'Payroll', 'Coaching'],
  FIN: ['Excel', 'Forecasting', 'IFRS', 'Budgeting', 'SAP'],
  OPS: ['Process design', 'Vendor mgmt', 'Logistics', 'Lean', 'Compliance'],
};

interface DeptSeed {
  id: string;
  name: string;
  code: string;
  location: string;
  description: string;
  budget: number;
  roles: { title: string; salary: [number, number] }[];
  size: number;
}

const DEPARTMENTS: DeptSeed[] = [
  { id: 'dep_eng', name: 'Engineering', code: 'ENG', location: 'New York HQ', budget: 2_400_000, size: 16, description: 'Builds and operates the core platform and internal tools.', roles: [{ title: 'VP of Engineering', salary: [185000, 210000] }, { title: 'Senior Software Engineer', salary: [125000, 155000] }, { title: 'Software Engineer', salary: [90000, 120000] }, { title: 'QA Engineer', salary: [75000, 95000] }, { title: 'DevOps Engineer', salary: [110000, 140000] }] },
  { id: 'dep_prd', name: 'Product', code: 'PRD', location: 'New York HQ', budget: 820_000, size: 6, description: 'Owns product strategy, discovery and the roadmap.', roles: [{ title: 'Head of Product', salary: [165000, 185000] }, { title: 'Product Manager', salary: [110000, 140000] }, { title: 'Product Analyst', salary: [80000, 100000] }] },
  { id: 'dep_des', name: 'Design', code: 'DES', location: 'Remote', budget: 540_000, size: 5, description: 'Crafts the end-to-end experience across web and mobile.', roles: [{ title: 'Design Lead', salary: [140000, 160000] }, { title: 'Product Designer', salary: [90000, 120000] }, { title: 'UX Researcher', salary: [85000, 105000] }] },
  { id: 'dep_mkt', name: 'Marketing', code: 'MKT', location: 'London Office', budget: 760_000, size: 7, description: 'Drives brand, demand generation and communications.', roles: [{ title: 'Marketing Director', salary: [150000, 170000] }, { title: 'Marketing Specialist', salary: [65000, 85000] }, { title: 'Content Strategist', salary: [70000, 90000] }] },
  { id: 'dep_sal', name: 'Sales', code: 'SAL', location: 'Austin Office', budget: 1_150_000, size: 9, description: 'Grows revenue through new business and expansion.', roles: [{ title: 'Head of Sales', salary: [160000, 180000] }, { title: 'Account Executive', salary: [70000, 95000] }, { title: 'Sales Development Rep', salary: [52000, 65000] }] },
  { id: 'dep_hr', name: 'Human Resources', code: 'HR', location: 'New York HQ', budget: 480_000, size: 5, description: 'Supports people, culture, hiring and compensation.', roles: [{ title: 'HR Manager', salary: [115000, 130000] }, { title: 'HR Generalist', salary: [62000, 78000] }, { title: 'Talent Acquisition Partner', salary: [70000, 88000] }] },
  { id: 'dep_fin', name: 'Finance', code: 'FIN', location: 'Toronto Office', budget: 560_000, size: 5, description: 'Manages accounting, planning, payroll and treasury.', roles: [{ title: 'Finance Director', salary: [155000, 175000] }, { title: 'Financial Analyst', salary: [75000, 95000] }, { title: 'Accountant', salary: [65000, 82000] }] },
  { id: 'dep_ops', name: 'Operations', code: 'OPS', location: 'New York HQ', budget: 640_000, size: 7, description: 'Keeps the company running: IT, facilities and vendors.', roles: [{ title: 'Chief Operating Officer', salary: [195000, 225000] }, { title: 'Operations Manager', salary: [95000, 115000] }, { title: 'IT Support Specialist', salary: [55000, 70000] }] },
];

/** Fixed demo identities, mapped onto specific seeded employees. */
const DEMO_PEOPLE: Record<string, { first: string; last: string; gender: Gender; dept: string; role: number }> = {
  emp_0001: { first: 'Sarah', last: 'Mitchell', gender: 'female', dept: 'dep_ops', role: 0 },
  emp_0002: { first: 'David', last: 'Chen', gender: 'male', dept: 'dep_hr', role: 0 },
  emp_0003: { first: 'Aisha', last: 'Khan', gender: 'female', dept: 'dep_eng', role: 2 },
};

export function generateSeed(version: number): MockDatabase {
  const rnd = mulberry32(20261010);
  const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rnd() * arr.length)];
  const between = (min: number, max: number) => Math.floor(min + rnd() * (max - min + 1));
  const chance = (p: number) => rnd() < p;
  const today = todayIso();
  const now = new Date();

  // ---- Departments ----------------------------------------------------------
  const departments: Department[] = DEPARTMENTS.map((d) => ({
    id: d.id,
    name: d.name,
    code: d.code,
    description: d.description,
    location: d.location,
    budget: d.budget,
    headId: null,
    createdAt: '2019-01-15',
  }));

  // ---- Employees ------------------------------------------------------------
  const employees: Employee[] = [];
  let n = 0;
  const nextId = () => `emp_${String(++n).padStart(4, '0')}`;

  const makeEmployee = (id: string, dept: DeptSeed, roleIdx: number, forced?: (typeof DEMO_PEOPLE)[string]): Employee => {
    const gender: Gender = forced?.gender ?? (chance(0.5) ? 'male' : 'female');
    const first = forced?.first ?? pick(gender === 'male' ? MALE_NAMES : FEMALE_NAMES);
    const last = forced?.last ?? pick(LAST_NAMES);
    const role = dept.roles[roleIdx];
    const [city, country] = OFFICE_CITY[dept.location] ?? pick(CITIES);
    const isHead = roleIdx === 0;
    const joinYear = isHead ? between(2018, 2021) : between(2019, now.getFullYear());
    let joinDate = toIsoDate(new Date(joinYear, between(0, 11), between(1, 28)));
    if (joinDate > today) joinDate = addDays(today, -between(20, 200));
    const monthsIn = (now.getTime() - parseIsoDate(joinDate).getTime()) / (30 * 86_400_000);
    const type: EmploymentType = isHead ? 'full-time' : rnd() < 0.82 ? 'full-time' : pick(['part-time', 'contract', 'intern'] as const);
    const status: EmploymentStatus = monthsIn < 3 ? 'probation' : 'active';
    const emailName = `${first}.${last}`.toLowerCase().normalize('NFD').replace(/[^a-z.]/g, '');

    return {
      id,
      code: `EMP-${id.slice(4)}`,
      firstName: first,
      lastName: last,
      email: forced ? `${first.toLowerCase()}.${last.toLowerCase()}@peoplecore.io` : `${emailName}${between(1, 99)}@peoplecore.io`,
      phone: `+1 (${between(200, 989)}) ${between(200, 989)}-${String(between(0, 9999)).padStart(4, '0')}`,
      gender,
      dateOfBirth: toIsoDate(new Date(between(1972, 2003), between(0, 11), between(1, 28))),
      joinDate,
      departmentId: dept.id,
      designation: role.title,
      managerId: null,
      employmentType: type,
      status,
      salary: Math.round(between(role.salary[0], role.salary[1]) / 500) * 500 * (type === 'part-time' ? 0.6 : type === 'intern' ? 0.4 : 1),
      address: `${between(10, 980)} ${pick(STREETS)}`,
      city,
      country,
      skills: [...new Set([pick(SKILLS[dept.code]), pick(SKILLS[dept.code]), pick(SKILLS[dept.code])])],
      emergencyContact: {
        name: `${pick([...MALE_NAMES, ...FEMALE_NAMES])} ${last}`,
        relation: pick(['Spouse', 'Parent', 'Sibling', 'Partner']),
        phone: `+1 (${between(200, 989)}) ${between(200, 989)}-${String(between(0, 9999)).padStart(4, '0')}`,
      },
      bankAccount: `**** **** ${String(between(1000, 9999))}`,
    };
  };

  // Demo users first so their ids are stable
  for (const [id, p] of Object.entries(DEMO_PEOPLE)) {
    n++;
    const dept = DEPARTMENTS.find((d) => d.id === p.dept)!;
    const e = makeEmployee(id, dept, p.role, p);
    e.joinDate = id === 'emp_0003' ? '2023-04-17' : e.joinDate;
    e.status = 'active';
    employees.push(e);
  }

  for (const dept of DEPARTMENTS) {
    const existing = employees.filter((e) => e.departmentId === dept.id).length;
    const hasHead = employees.some((e) => e.departmentId === dept.id && e.designation === dept.roles[0].title);
    for (let i = existing; i < dept.size; i++) {
      const roleIdx = !hasHead && i === existing ? 0 : between(1, dept.roles.length - 1);
      employees.push(makeEmployee(nextId(), dept, roleIdx));
    }
  }

  // Department heads and reporting lines
  for (const dept of departments) {
    const seed = DEPARTMENTS.find((d) => d.id === dept.id)!;
    const head = employees.find((e) => e.departmentId === dept.id && e.designation === seed.roles[0].title);
    dept.headId = head?.id ?? null;
    for (const e of employees) {
      if (e.departmentId === dept.id && e.id !== head?.id) e.managerId = head?.id ?? null;
    }
  }
  const coo = employees.find((e) => e.id === 'emp_0001')!;
  for (const dept of departments) {
    const head = employees.find((e) => e.id === dept.headId);
    if (head && head.id !== coo.id) head.managerId = coo.id;
  }

  // A few employees who left, plus a couple on long leave
  const regular = employees.filter((e) => !DEMO_PEOPLE[e.id] && !departments.some((d) => d.headId === e.id));
  regular.slice(-4).forEach((e) => (e.status = 'terminated'));
  regular.slice(5, 7).forEach((e) => (e.status = 'on-leave'));

  const workforce = employees.filter((e) => e.status !== 'terminated');

  // ---- Leave requests -------------------------------------------------------
  const leaves: LeaveRequest[] = [];
  const leaveTypes: LeaveType[] = ['annual', 'annual', 'annual', 'sick', 'sick', 'casual', 'unpaid'];
  const reasons: Record<LeaveType, string[]> = {
    annual: ['Family vacation', 'Travelling abroad', 'Personal time off', 'Visiting relatives'],
    sick: ['Flu and fever', 'Medical appointment', 'Recovering from surgery', 'Migraine'],
    casual: ['Moving house', 'Personal errand', 'Child’s school event'],
    parental: ['Arrival of a newborn'],
    unpaid: ['Extended travel', 'Personal matters'],
  };
  const hr = employees.find((e) => e.id === 'emp_0002')!;
  let leaveN = 0;
  const addLeave = (emp: Employee, start: string, len: number, type: LeaveType, status: LeaveStatus) => {
    while (isWeekend(start)) start = addDays(start, 1);
    let end = start;
    let added = 1;
    while (added < len) {
      end = addDays(end, 1);
      if (!isWeekend(end)) added++;
    }
    const appliedOn = addDays(start, -between(3, 20));
    leaves.push({
      id: `lv_${String(++leaveN).padStart(4, '0')}`,
      employeeId: emp.id,
      type,
      startDate: start,
      endDate: end,
      days: workingDaysBetween(start, end),
      reason: pick(reasons[type]),
      status,
      appliedOn: appliedOn > today ? today : appliedOn,
      ...(status === 'approved' || status === 'rejected'
        ? { reviewedBy: hr.id, reviewedOn: addDays(appliedOn, between(0, 2)) > today ? today : addDays(appliedOn, between(0, 2)), reviewNote: status === 'rejected' ? 'Overlaps with a critical release window.' : '' }
        : {}),
    });
  };

  for (let i = 0; i < 46; i++) {
    const emp = pick(workforce);
    const offset = between(-120, 30);
    const start = addDays(today, offset);
    const type = pick(leaveTypes);
    const len = type === 'sick' ? between(1, 3) : between(1, 5);
    const status: LeaveStatus = offset > 0 ? (chance(0.6) ? 'pending' : 'approved') : chance(0.85) ? 'approved' : chance(0.6) ? 'rejected' : 'cancelled';
    addLeave(emp, start, len, type, status);
  }
  // Demo employee history + one pending request
  const aisha = employees.find((e) => e.id === 'emp_0003')!;
  addLeave(aisha, addDays(today, -75), 3, 'annual', 'approved');
  addLeave(aisha, addDays(today, -32), 1, 'sick', 'approved');
  addLeave(aisha, addDays(today, 18), 4, 'annual', 'pending');
  // Someone off today, so the dashboard has something to show
  addLeave(workforce[10], addDays(today, -1), 3, 'annual', 'approved');
  addLeave(workforce[22], today, 2, 'sick', 'approved');

  const onLeaveOn = (empId: string, date: string) =>
    leaves.some((l) => l.employeeId === empId && l.status === 'approved' && l.startDate <= date && l.endDate >= date);

  // ---- Attendance (last 45 days) -------------------------------------------
  const attendance: AttendanceRecord[] = [];
  let attN = 0;
  const fmt = (mins: number) => `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  for (let back = 45; back >= 0; back--) {
    const date = addDays(today, -back);
    if (isWeekend(date)) continue;
    const isToday = back === 0;
    for (const emp of workforce) {
      if (emp.joinDate > date || emp.status === 'on-leave') continue;
      if (isToday && DEMO_PEOPLE[emp.id]) continue; // let demo users clock in themselves
      let status: AttendanceStatus;
      if (onLeaveOn(emp.id, date)) status = 'on-leave';
      else {
        const r = rnd();
        status = r < 0.76 ? 'present' : r < 0.85 ? 'late' : r < 0.93 ? 'remote' : r < 0.96 ? 'half-day' : 'absent';
      }
      let checkIn: string | null = null;
      let checkOut: string | null = null;
      let hours = 0;
      if (status !== 'absent' && status !== 'on-leave') {
        const inMin = status === 'late' ? between(9 * 60 + 16, 10 * 60 + 30) : between(8 * 60 + 20, 9 * 60 + 10);
        if (isToday && inMin > nowMinutes) continue; // hasn't arrived yet
        const span = status === 'half-day' ? between(210, 260) : between(480, 570);
        checkIn = fmt(inMin);
        const outMin = inMin + span;
        if (!isToday || outMin <= nowMinutes) {
          checkOut = fmt(outMin);
          hours = Math.round((span / 60) * 100) / 100;
        }
      }
      attendance.push({ id: `att_${++attN}`, employeeId: emp.id, date, checkIn, checkOut, status, hours });
    }
  }

  // ---- Payslips (last 3 closed months) --------------------------------------
  const payslips: Payslip[] = [];
  let psN = 0;
  const currentPeriod = monthKey(now);
  for (let m = 3; m >= 1; m--) {
    const period = shiftMonth(currentPeriod, -m);
    for (const emp of employees) {
      if (monthKey(emp.joinDate) > period) continue;
      if (emp.status === 'terminated' && m === 1) continue;
      const calc = calculatePayslip({
        employee: emp,
        period,
        overtimeHours: chance(0.25) ? between(2, 14) : 0,
        bonus: chance(0.08) ? between(5, 20) * 100 : 0,
      });
      payslips.push({
        id: `ps_${String(++psN).padStart(5, '0')}`,
        ...calc,
        status: 'paid',
        generatedOn: `${shiftMonth(period, 1)}-01`,
        paidOn: `${shiftMonth(period, 1)}-03`,
      });
    }
  }

  // ---- Recruitment ----------------------------------------------------------
  const jobs: JobOpening[] = [
    { id: 'job_01', title: 'Senior Frontend Engineer', departmentId: 'dep_eng', location: 'New York / Hybrid', employmentType: 'full-time', openings: 2, status: 'open', postedOn: addDays(today, -21), closingOn: addDays(today, 24), salaryMin: 130000, salaryMax: 160000, experience: '5+ years', description: 'Own the Angular front end of our core HR platform, mentor engineers and shape our design system.' },
    { id: 'job_02', title: 'DevOps Engineer', departmentId: 'dep_eng', location: 'Remote', employmentType: 'full-time', openings: 1, status: 'open', postedOn: addDays(today, -12), closingOn: addDays(today, 30), salaryMin: 115000, salaryMax: 145000, experience: '3+ years', description: 'Run our Kubernetes infrastructure, CI/CD pipelines and observability stack.' },
    { id: 'job_03', title: 'Product Designer', departmentId: 'dep_des', location: 'Remote', employmentType: 'full-time', openings: 1, status: 'open', postedOn: addDays(today, -30), closingOn: addDays(today, 10), salaryMin: 95000, salaryMax: 120000, experience: '3+ years', description: 'Design delightful, accessible workflows for HR teams and employees.' },
    { id: 'job_04', title: 'Account Executive', departmentId: 'dep_sal', location: 'Austin', employmentType: 'full-time', openings: 3, status: 'open', postedOn: addDays(today, -8), closingOn: addDays(today, 40), salaryMin: 70000, salaryMax: 95000, experience: '2+ years', description: 'Close new business with mid-market customers across North America.' },
    { id: 'job_05', title: 'HR Generalist', departmentId: 'dep_hr', location: 'New York', employmentType: 'full-time', openings: 1, status: 'on-hold', postedOn: addDays(today, -45), closingOn: addDays(today, 5), salaryMin: 62000, salaryMax: 78000, experience: '2+ years', description: 'Support employee relations, onboarding and HR operations.' },
    { id: 'job_06', title: 'Marketing Intern', departmentId: 'dep_mkt', location: 'London', employmentType: 'intern', openings: 2, status: 'open', postedOn: addDays(today, -5), closingOn: addDays(today, 25), salaryMin: 24000, salaryMax: 30000, experience: 'Students', description: 'Six-month internship supporting campaigns, events and content.' },
    { id: 'job_07', title: 'Financial Analyst', departmentId: 'dep_fin', location: 'Toronto', employmentType: 'full-time', openings: 1, status: 'closed', postedOn: addDays(today, -80), closingOn: addDays(today, -20), salaryMin: 75000, salaryMax: 95000, experience: '2+ years', description: 'Build models and reporting that guide company planning.' },
  ];
  const stages: CandidateStage[] = ['applied', 'applied', 'applied', 'screening', 'screening', 'interview', 'interview', 'offer', 'hired', 'rejected', 'rejected'];
  const sources = ['LinkedIn', 'Referral', 'Careers page', 'Indeed', 'Agency', 'Glassdoor'];
  const candidates: Candidate[] = [];
  for (let i = 1; i <= 42; i++) {
    const job = pick(jobs.filter((j) => j.status !== 'closed' || chance(0.3)));
    const gender = chance(0.5);
    const first = pick(gender ? MALE_NAMES : FEMALE_NAMES);
    const last = pick(LAST_NAMES);
    candidates.push({
      id: `cand_${String(i).padStart(3, '0')}`,
      jobId: job.id,
      name: `${first} ${last}`,
      email: `${first}.${last}`.toLowerCase().replace(/[^a-z.]/g, '') + '@mail.com',
      phone: `+1 (${between(200, 989)}) ${between(200, 989)}-${String(between(0, 9999)).padStart(4, '0')}`,
      stage: job.status === 'closed' ? pick(['hired', 'rejected'] as const) : pick(stages),
      appliedOn: addDays(job.postedOn, between(0, 15)) > today ? today : addDays(job.postedOn, between(0, 15)),
      rating: between(2, 5),
      source: pick(sources),
      experienceYears: between(0, 12),
      notes: '',
    });
  }

  // ---- Performance reviews (last quarter) -----------------------------------
  const lastQuarter = quarterKey(new Date(now.getFullYear(), now.getMonth() - 3, 1));
  const goalsPool = ['Ship quarterly roadmap items', 'Improve test coverage to 80%', 'Mentor a junior teammate', 'Reduce support tickets by 15%', 'Complete leadership training', 'Hit quarterly revenue target', 'Launch new onboarding flow', 'Document team processes'];
  const reviews: PerformanceReview[] = workforce
    .filter((e) => e.managerId && monthKey(e.joinDate) < shiftMonth(currentPeriod, -4))
    .slice(0, 34)
    .map((e, i) => ({
      id: `rev_${String(i + 1).padStart(3, '0')}`,
      employeeId: e.id,
      reviewerId: e.managerId!,
      period: lastQuarter,
      rating: Math.min(5, Math.max(1, Math.round(2.4 + rnd() * 2.8))),
      goals: [...new Set([pick(goalsPool), pick(goalsPool), pick(goalsPool)])].map((title) => ({ title, progress: between(4, 20) * 5 })),
      strengths: pick(['Consistently delivers high-quality work.', 'Strong collaborator who lifts the team.', 'Takes ownership and communicates proactively.', 'Deep domain expertise and sound judgement.']),
      improvements: pick(['Delegate more to grow the team.', 'Share progress earlier with stakeholders.', 'Focus on fewer priorities at a time.', 'Invest in written documentation.']),
      status: chance(0.6) ? 'acknowledged' : chance(0.7) ? 'submitted' : 'draft',
      createdOn: addDays(today, -between(10, 40)),
    }));

  // ---- Company --------------------------------------------------------------
  const announcements: Announcement[] = [
    { id: 'ann_1', title: 'Open enrolment for 2027 benefits starts next week', body: 'Review your health, dental and pension options in the benefits portal. Enrolment closes at the end of the month — reach out to HR with any questions.', category: 'policy', authorId: 'emp_0002', publishedOn: addDays(today, -1), pinned: true },
    { id: 'ann_2', title: 'Quarterly all-hands on Friday', body: 'Join us in the main hall or on the livestream for product updates, team shout-outs and Q&A with leadership.', category: 'event', authorId: 'emp_0001', publishedOn: addDays(today, -3), pinned: false },
    { id: 'ann_3', title: 'Updated remote-work policy', body: 'Hybrid employees can now work remotely up to three days per week. The full policy is available in the handbook.', category: 'policy', authorId: 'emp_0002', publishedOn: addDays(today, -9), pinned: false },
    { id: 'ann_4', title: 'Office network maintenance this Saturday', body: 'Wi-Fi and VPN will be unavailable between 08:00 and 12:00. Please save your work before leaving on Friday.', category: 'urgent', authorId: 'emp_0001', publishedOn: addDays(today, -2), pinned: false },
    { id: 'ann_5', title: 'Welcome to our newest team members!', body: 'Please give a warm welcome to everyone who joined us this month across Engineering, Sales and Marketing.', category: 'general', authorId: 'emp_0002', publishedOn: addDays(today, -14), pinned: false },
  ];

  const y = now.getFullYear();
  const holidays: Holiday[] = [
    ['New Year’s Day', `${y}-01-01`, 'public'],
    ['Martin Luther King Jr. Day', `${y}-01-19`, 'public'],
    ['Presidents’ Day', `${y}-02-16`, 'optional'],
    ['Memorial Day', `${y}-05-25`, 'public'],
    ['Independence Day', `${y}-07-03`, 'public'],
    ['Labor Day', `${y}-09-07`, 'public'],
    ['Columbus Day', `${y}-10-12`, 'optional'],
    ['Veterans Day', `${y}-11-11`, 'optional'],
    ['Thanksgiving Day', `${y}-11-26`, 'public'],
    ['Day after Thanksgiving', `${y}-11-27`, 'optional'],
    ['Christmas Eve', `${y}-12-24`, 'optional'],
    ['Christmas Day', `${y}-12-25`, 'public'],
    ['New Year’s Day', `${y + 1}-01-01`, 'public'],
  ].map(([name, date, type], i) => ({ id: `hol_${i + 1}`, name, date, type: type as Holiday['type'] }));

  // ---- Logins ---------------------------------------------------------------
  const users: UserAccount[] = [
    { id: 'usr_admin', name: 'Sarah Mitchell', email: 'admin@peoplecore.io', password: 'admin123', role: 'admin', employeeId: 'emp_0001' },
    { id: 'usr_hr', name: 'David Chen', email: 'hr@peoplecore.io', password: 'hr123', role: 'hr', employeeId: 'emp_0002' },
    { id: 'usr_emp', name: 'Aisha Khan', email: 'employee@peoplecore.io', password: 'emp123', role: 'employee', employeeId: 'emp_0003' },
  ];

  return {
    version,
    seededOn: today,
    users,
    employees,
    departments,
    attendance,
    leaves,
    payslips,
    jobs,
    candidates,
    reviews,
    announcements,
    holidays,
  };
}
