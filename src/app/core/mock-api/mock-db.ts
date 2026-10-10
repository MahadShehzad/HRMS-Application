import { Injectable } from '@angular/core';
import { Entity } from '../models';
import type { MockDatabase } from './seed-data';

const STORAGE_KEY = 'hrms.mockdb';
/** Bump when the data shape changes so stale browser data is re-seeded. */
export const DB_VERSION = 1;

export type CollectionName = Exclude<keyof MockDatabase, 'version' | 'seededOn' | 'users'>;

export const COLLECTIONS: readonly CollectionName[] = [
  'employees',
  'departments',
  'attendance',
  'leaves',
  'payslips',
  'jobs',
  'candidates',
  'reviews',
  'announcements',
  'holidays',
];

/**
 * In-browser database backing the mock API. Data lives in memory and is
 * persisted to localStorage (debounced) so changes survive a page reload.
 * The seed generator is lazy-loaded, so it only costs bytes on first launch.
 */
@Injectable({ providedIn: 'root' })
export class MockDb {
  private db: MockDatabase | null = null;
  private loading: Promise<void> | null = null;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  /** Resolves once the database is available. */
  ready(): Promise<void> {
    if (this.db) return Promise.resolve();
    return (this.loading ??= this.restore().then(async (stored) => {
      this.db = stored ?? (await this.seed());
    }));
  }

  /** Synchronous access — only valid after {@link ready} has resolved. */
  get data(): MockDatabase {
    if (!this.db) throw new Error('MockDb accessed before ready()');
    return this.db;
  }

  collection<T extends Entity>(name: CollectionName): T[] {
    return this.data[name] as unknown as T[];
  }

  isCollection(name: string): name is CollectionName {
    return (COLLECTIONS as readonly string[]).includes(name);
  }

  /** Schedule a write to localStorage; coalesces bursts of mutations. */
  persist(): void {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.db));
      } catch {
        // Storage full or unavailable — keep working in memory.
      }
    }, 250);
  }

  async reset(): Promise<void> {
    this.db = await this.seed();
  }

  private async restore(): Promise<MockDatabase | null> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as MockDatabase;
        if (parsed.version === DB_VERSION) return parsed;
      }
    } catch {
      // Corrupt data — fall through to a fresh seed.
    }
    return null;
  }

  private async seed(): Promise<MockDatabase> {
    const { generateSeed } = await import('./seed-data');
    const fresh = generateSeed(DB_VERSION);
    this.db = fresh;
    this.persist();
    return fresh;
  }
}
