import { Entity, IsoDate } from './common.model';

export interface Department extends Entity {
  name: string;
  code: string;
  description: string;
  headId: string | null;
  location: string;
  /** Annual budget. */
  budget: number;
  createdAt: IsoDate;
}
