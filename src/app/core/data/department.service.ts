import { Injectable } from '@angular/core';
import { Department } from '../models';
import { EntityStore } from './entity-store';

@Injectable({ providedIn: 'root' })
export class DepartmentService extends EntityStore<Department> {
  protected readonly resource = 'departments';

  nameOf(id: string | null | undefined): string {
    return (id && this.byId().get(id)?.name) || '—';
  }
}
