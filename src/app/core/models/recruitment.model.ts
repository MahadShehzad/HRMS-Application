import { Entity, IsoDate } from './common.model';
import { EmploymentType } from './employee.model';

export type JobStatus = 'open' | 'on-hold' | 'closed';

export interface JobOpening extends Entity {
  title: string;
  departmentId: string;
  location: string;
  employmentType: EmploymentType;
  openings: number;
  status: JobStatus;
  postedOn: IsoDate;
  closingOn: IsoDate;
  salaryMin: number;
  salaryMax: number;
  experience: string;
  description: string;
}

export type CandidateStage = 'applied' | 'screening' | 'interview' | 'offer' | 'hired' | 'rejected';

export interface StageConfig {
  stage: CandidateStage;
  label: string;
  tone: 'secondary' | 'info' | 'primary' | 'warning' | 'success' | 'danger';
}

export const CANDIDATE_STAGES: StageConfig[] = [
  { stage: 'applied', label: 'Applied', tone: 'secondary' },
  { stage: 'screening', label: 'Screening', tone: 'info' },
  { stage: 'interview', label: 'Interview', tone: 'primary' },
  { stage: 'offer', label: 'Offer', tone: 'warning' },
  { stage: 'hired', label: 'Hired', tone: 'success' },
  { stage: 'rejected', label: 'Rejected', tone: 'danger' },
];

export interface Candidate extends Entity {
  jobId: string;
  name: string;
  email: string;
  phone: string;
  stage: CandidateStage;
  appliedOn: IsoDate;
  /** 1–5 */
  rating: number;
  source: string;
  experienceYears: number;
  notes: string;
}
