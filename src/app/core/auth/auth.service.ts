import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { silentErrors } from '../http/http-context';
import { AuthSession, LoginRequest, Role, User } from '../models';
import { CacheRegistry } from '../services/cache-registry.service';

const SESSION_KEY = 'hrms.session';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly caches = inject(CacheRegistry);

  private readonly session = signal<AuthSession | null>(this.restore());

  readonly user = computed<User | null>(() => this.session()?.user ?? null);
  readonly isAuthenticated = computed(() => !!this.session());
  readonly role = computed<Role | null>(() => this.user()?.role ?? null);
  /** Admins and HR managers can manage company-wide data. */
  readonly isManager = computed(() => this.role() === 'admin' || this.role() === 'hr');
  readonly isAdmin = computed(() => this.role() === 'admin');

  get token(): string | null {
    const s = this.session();
    return s && s.expiresAt > Date.now() ? s.token : null;
  }

  login(request: LoginRequest): Observable<AuthSession> {
    const context = silentErrors(); // the login form shows its own error message
    return this.http.post<AuthSession>(`${environment.apiUrl}/auth/login`, request, { context }).pipe(
      tap((session) => {
        const store = request.remember ? localStorage : sessionStorage;
        store.setItem(SESSION_KEY, JSON.stringify(session));
        this.session.set(session);
      }),
    );
  }

  logout(redirect = true): void {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    this.session.set(null);
    this.caches.clearAll();
    if (redirect) this.router.navigate(['/auth/login']);
  }

  changePassword(currentPassword: string, newPassword: string): Observable<unknown> {
    return this.http.post(
      `${environment.apiUrl}/auth/change-password`,
      { currentPassword, newPassword },
      { context: silentErrors() },
    );
  }

  hasRole(...roles: Role[]): boolean {
    const role = this.role();
    return !!role && roles.includes(role);
  }

  /** Update the display name locally after a profile edit. */
  patchUser(changes: Partial<Pick<User, 'name'>>): void {
    const s = this.session();
    if (!s) return;
    const next = { ...s, user: { ...s.user, ...changes } };
    this.session.set(next);
    const store = localStorage.getItem(SESSION_KEY) ? localStorage : sessionStorage;
    store.setItem(SESSION_KEY, JSON.stringify(next));
  }

  private restore(): AuthSession | null {
    try {
      const raw = localStorage.getItem(SESSION_KEY) ?? sessionStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const session = JSON.parse(raw) as AuthSession;
      return session.expiresAt > Date.now() ? session : null;
    } catch {
      return null;
    }
  }
}
