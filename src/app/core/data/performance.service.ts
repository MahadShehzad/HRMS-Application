import { Injectable } from '@angular/core';
import { PerformanceReview } from '../models';
import { EntityStore } from './entity-store';

@Injectable({ providedIn: 'root' })
export class PerformanceService extends EntityStore<PerformanceReview> {
  protected readonly resource = 'reviews';
}
