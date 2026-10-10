import { Role } from '../models';

export interface NavItem {
  label: string;
  icon: string;
  route: string;
  /** Omit for "everyone". */
  roles?: Role[];
  /** Key used by the sidebar to show a live counter badge. */
  badge?: 'pendingLeaves';
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

const MANAGERS: Role[] = ['admin', 'hr'];

/** Single source of truth for the sidebar, quick search and breadcrumbs. */
export const NAVIGATION: NavGroup[] = [
  {
    title: 'Overview',
    items: [{ label: 'Dashboard', icon: 'bi-grid-1x2', route: '/dashboard' }],
  },
  {
    title: 'People',
    items: [
      { label: 'Employees', icon: 'bi-people', route: '/employees' },
      { label: 'Departments', icon: 'bi-diagram-3', route: '/departments', roles: MANAGERS },
      { label: 'Attendance', icon: 'bi-calendar-check', route: '/attendance' },
      { label: 'Leave', icon: 'bi-airplane', route: '/leave', badge: 'pendingLeaves' },
    ],
  },
  {
    title: 'Talent & Pay',
    items: [
      { label: 'Payroll', icon: 'bi-cash-stack', route: '/payroll' },
      { label: 'Recruitment', icon: 'bi-briefcase', route: '/recruitment', roles: MANAGERS },
      { label: 'Performance', icon: 'bi-graph-up-arrow', route: '/performance' },
    ],
  },
  {
    title: 'Company',
    items: [
      { label: 'Announcements', icon: 'bi-megaphone', route: '/company' },
      { label: 'Reports', icon: 'bi-bar-chart-line', route: '/reports', roles: MANAGERS },
      { label: 'Settings', icon: 'bi-gear', route: '/settings' },
    ],
  },
];

export function navigationFor(role: Role | null): NavGroup[] {
  return NAVIGATION.map((g) => ({
    ...g,
    items: g.items.filter((i) => !i.roles || (role && i.roles.includes(role))),
  })).filter((g) => g.items.length);
}
