import { Entity, IsoDate } from './common.model';

export type ReviewStatus = 'draft' | 'submitted' | 'acknowledged';

export interface ReviewGoal {
  title: string;
  /** 0–100 */
  progress: number;
}

export interface PerformanceReview extends Entity {
  employeeId: string;
  reviewerId: string;
  /** e.g. `2026-Q3` */
  period: string;
  /** 1–5 */
  rating: number;
  goals: ReviewGoal[];
  strengths: string;
  improvements: string;
  status: ReviewStatus;
  createdOn: IsoDate;
}

export const RATING_LABELS: Record<number, string> = {
  1: 'Needs improvement',
  2: 'Below expectations',
  3: 'Meets expectations',
  4: 'Exceeds expectations',
  5: 'Outstanding',
};
