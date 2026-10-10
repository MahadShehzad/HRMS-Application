import { Injectable } from '@angular/core';
import { Candidate, CandidateStage, JobOpening } from '../models';
import { EntityStore } from './entity-store';

@Injectable({ providedIn: 'root' })
export class JobService extends EntityStore<JobOpening> {
  protected readonly resource = 'jobs';
}

@Injectable({ providedIn: 'root' })
export class CandidateService extends EntityStore<Candidate> {
  protected readonly resource = 'candidates';

  moveTo(candidate: Candidate, stage: CandidateStage) {
    return this.update(candidate.id, { stage });
  }
}
