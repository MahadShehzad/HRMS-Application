import { DOCUMENT } from '@angular/common';
import { effect, inject, Injectable, signal } from '@angular/core';

export type ThemeMode = 'light' | 'dark' | 'auto';

const THEME_KEY = 'hrms.theme';
const SIDEBAR_KEY = 'hrms.sidebarCollapsed';

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** User interface preferences: colour theme and sidebar state. */
@Injectable({ providedIn: 'root' })
export class PreferencesService {
  private readonly doc = inject(DOCUMENT);
  /** `null` where matchMedia is unavailable (SSR, jsdom tests). */
  private readonly media =
    typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : null;

  readonly theme = signal<ThemeMode>((read(THEME_KEY) as ThemeMode) || 'light');
  readonly sidebarCollapsed = signal(read(SIDEBAR_KEY) === '1');
  /** The theme actually applied after resolving `auto`. */
  readonly resolvedTheme = signal<'light' | 'dark'>('light');

  constructor() {
    this.media?.addEventListener('change', () => this.apply(this.theme()));

    effect(() => {
      const mode = this.theme();
      localStorage.setItem(THEME_KEY, mode);
      this.apply(mode);
    });

    effect(() => localStorage.setItem(SIDEBAR_KEY, this.sidebarCollapsed() ? '1' : '0'));
  }

  toggleTheme(): void {
    this.theme.set(this.resolvedTheme() === 'dark' ? 'light' : 'dark');
  }

  toggleSidebar(): void {
    this.sidebarCollapsed.update((v) => !v);
  }

  private apply(mode: ThemeMode): void {
    const dark = mode === 'dark' || (mode === 'auto' && !!this.media?.matches);
    this.resolvedTheme.set(dark ? 'dark' : 'light');
    this.doc.documentElement.setAttribute('data-bs-theme', dark ? 'dark' : 'light');
  }
}
