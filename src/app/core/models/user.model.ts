import { Entity } from './common.model';

export type Role = 'admin' | 'hr' | 'employee';

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Administrator',
  hr: 'HR Manager',
  employee: 'Employee',
};

export interface User extends Entity {
  name: string;
  email: string;
  role: Role;
  /** The employee record this login belongs to. */
  employeeId: string;
}

/** Stored server-side only (mock API); never exposed to the UI. */
export interface UserAccount extends User {
  password: string;
}

export interface AuthSession {
  token: string;
  user: User;
  expiresAt: number;
}

export interface LoginRequest {
  email: string;
  password: string;
  remember: boolean;
}
