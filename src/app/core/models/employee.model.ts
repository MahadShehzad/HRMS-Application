import { Entity, IsoDate } from './common.model';

export type Gender = 'male' | 'female' | 'other';
export type EmploymentType = 'full-time' | 'part-time' | 'contract' | 'intern';
export type EmploymentStatus = 'active' | 'probation' | 'on-leave' | 'terminated';

export const EMPLOYMENT_TYPES: EmploymentType[] = ['full-time', 'part-time', 'contract', 'intern'];
export const EMPLOYMENT_STATUSES: EmploymentStatus[] = [
  'active',
  'probation',
  'on-leave',
  'terminated',
];

export interface EmergencyContact {
  name: string;
  relation: string;
  phone: string;
}

export interface Employee extends Entity {
  /** Human-readable staff number, e.g. EMP-0042. */
  code: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  gender: Gender;
  dateOfBirth: IsoDate;
  joinDate: IsoDate;
  departmentId: string;
  designation: string;
  managerId: string | null;
  employmentType: EmploymentType;
  status: EmploymentStatus;
  /** Annual base salary. */
  salary: number;
  address: string;
  city: string;
  country: string;
  skills: string[];
  emergencyContact: EmergencyContact;
  bankAccount: string;
}

export const fullName = (e: Pick<Employee, 'firstName' | 'lastName'> | null | undefined): string =>
  e ? `${e.firstName} ${e.lastName}` : '—';
