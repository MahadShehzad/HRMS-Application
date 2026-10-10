import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Announcement, Holiday } from '../models';
import { EntityStore } from './entity-store';

@Injectable({ providedIn: 'root' })
export class AnnouncementService extends EntityStore<Announcement> {
  protected readonly resource = 'announcements';
}

@Injectable({ providedIn: 'root' })
export class HolidayService extends EntityStore<Holiday> {
  protected readonly resource = 'holidays';
}

/** Administrative operations that are not tied to one resource. */
@Injectable({ providedIn: 'root' })
export class SystemService {
  private readonly http = inject(HttpClient);

  resetDemoData(): Observable<unknown> {
    return this.http.post(`${environment.apiUrl}/system/reset`, {});
  }
}
