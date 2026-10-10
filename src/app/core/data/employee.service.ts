import { computed, Injectable } from '@angular/core';
import { Employee, fullName } from '../models';
import { EntityStore } from './entity-store';

@Injectable({ providedIn: 'root' })
export class EmployeeService extends EntityStore<Employee> {
  protected readonly resource = 'employees';

  /** Everyone currently employed (excludes terminated). */
  readonly workforce = computed(() => this.items().filter((e) => e.status !== 'terminated'));

  nameOf(id: string | null | undefined): string {
    return fullName(id ? this.byId().get(id) : null);
  }
}
