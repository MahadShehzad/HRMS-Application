import { Entity, IsoDate } from './common.model';

export type AnnouncementCategory = 'general' | 'policy' | 'event' | 'urgent';

export interface Announcement extends Entity {
  title: string;
  body: string;
  category: AnnouncementCategory;
  authorId: string;
  publishedOn: IsoDate;
  pinned: boolean;
}

export type HolidayType = 'public' | 'optional';

export interface Holiday extends Entity {
  name: string;
  date: IsoDate;
  type: HolidayType;
}
