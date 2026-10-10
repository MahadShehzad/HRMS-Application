import { Injectable } from '@angular/core';

export interface Clearable {
  clear(): void;
}

/**
 * Tracks every client-side data cache so they can all be dropped at once
 * (e.g. on logout, so the next user never sees the previous user's data).
 */
@Injectable({ providedIn: 'root' })
export class CacheRegistry {
  private readonly caches = new Set<Clearable>();

  register(cache: Clearable): void {
    this.caches.add(cache);
  }

  clearAll(): void {
    this.caches.forEach((c) => c.clear());
  }
}
