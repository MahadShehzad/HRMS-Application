import { HttpClient, HttpParams } from '@angular/common/http';
import { computed, inject, signal } from '@angular/core';
import { finalize, Observable, of, shareReplay, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Entity } from '../models';
import { CacheRegistry } from '../services/cache-registry.service';

export type QueryParams = Record<string, string | number | boolean>;

/**
 * Base class for every REST resource.
 *
 * - `load()` fetches the collection once and caches it in a signal; calling it
 *   again is free, so any component can call it without coordinating.
 * - Mutations (`create` / `update` / `remove`) update the cache optimistically
 *   on success, so every screen reading `items()` re-renders instantly.
 * - `query()` performs an uncached, filtered fetch for large collections.
 */
export abstract class EntityStore<T extends Entity> {
  protected readonly http = inject(HttpClient);
  protected abstract readonly resource: string;

  private readonly _items = signal<T[]>([]);
  private readonly _loaded = signal(false);
  private readonly _loading = signal(false);
  private inflight: Observable<T[]> | null = null;

  /** All cached records. */
  readonly items = this._items.asReadonly();
  /** True once the first load has completed (use for skeletons). */
  readonly loaded = this._loaded.asReadonly();
  /** True while any load is running (use for refresh spinners). */
  readonly loading = this._loading.asReadonly();
  /** O(1) lookup by id. */
  readonly byId = computed(() => new Map(this._items().map((i) => [i.id, i])));

  constructor() {
    inject(CacheRegistry).register(this);
  }

  protected get url(): string {
    return `${environment.apiUrl}/${this.resource}`;
  }

  /** Fetch the collection (deduped; no-op if already loaded unless `force`). */
  load(force = false): Observable<T[]> {
    if (this._loaded() && !force) return of(this._items());
    if (this.inflight) return this.inflight;

    this._loading.set(true);
    this.inflight = this.http.get<T[]>(this.url).pipe(
      tap((items) => {
        this._items.set(items);
        this._loaded.set(true);
      }),
      finalize(() => {
        this._loading.set(false);
        this.inflight = null;
      }),
      shareReplay(1),
    );
    // Start immediately so callers that don't subscribe still populate the cache
    this.inflight.subscribe({ error: () => undefined });
    return this.inflight;
  }

  /** Convenience for components: trigger a load and ignore the result. */
  ensureLoaded(): void {
    if (!this._loaded()) this.load();
  }

  get(id: string): Observable<T> {
    return this.http.get<T>(`${this.url}/${id}`);
  }

  query(params: QueryParams): Observable<T[]> {
    return this.http.get<T[]>(this.url, { params: new HttpParams({ fromObject: params }) });
  }

  create(data: Omit<T, 'id'>): Observable<T> {
    return this.http.post<T>(this.url, data).pipe(tap((created) => this.upsert(created, true)));
  }

  update(id: string, changes: Partial<T>): Observable<T> {
    return this.http.patch<T>(`${this.url}/${id}`, changes).pipe(tap((u) => this.upsert(u)));
  }

  remove(id: string): Observable<unknown> {
    return this.http
      .delete(`${this.url}/${id}`)
      .pipe(tap(() => this._items.update((list) => list.filter((i) => i.id !== id))));
  }

  clear(): void {
    this._items.set([]);
    this._loaded.set(false);
  }

  /** Merge a server record into the cache. */
  protected upsert(record: T, prepend = false): void {
    this._items.update((list) => {
      const idx = list.findIndex((i) => i.id === record.id);
      if (idx < 0) return prepend ? [record, ...list] : [...list, record];
      const next = list.slice();
      next[idx] = record;
      return next;
    });
  }
}
