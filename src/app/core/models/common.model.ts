/** Every persisted entity has a string id. */
export interface Entity {
  id: string;
}

/** ISO date string, `YYYY-MM-DD`. */
export type IsoDate = string;

export type SortDirection = 'asc' | 'desc';

export interface SortState<K extends string = string> {
  key: K;
  dir: SortDirection;
}

/** Bootstrap contextual colour names, used for badges, icons and buttons. */
export type Tone = 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'danger' | 'dark';
