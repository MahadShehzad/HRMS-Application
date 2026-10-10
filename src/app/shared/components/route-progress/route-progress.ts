import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import {
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationStart,
  Router,
} from '@angular/router';

/**
 * Slim top progress bar for route changes. It only appears if navigation takes
 * longer than ~120 ms (e.g. downloading a lazy chunk) — instant navigations
 * show nothing, so there's no flicker.
 */
@Component({
  selector: 'app-route-progress',
  template: `
    @if (state() !== 'idle') {
      <div class="route-progress" [class.done]="state() === 'done'" role="progressbar" aria-label="Loading page">
        <div class="bar"></div>
      </div>
    }
  `,
  styles: `
    .route-progress {
      position: fixed; top: 0; left: 0; right: 0; height: 3px; z-index: 2000; pointer-events: none;
    }
    .bar {
      height: 100%; width: 100%; transform-origin: left;
      background: linear-gradient(90deg, var(--bs-primary), #8b9cff);
      box-shadow: 0 0 8px rgba(var(--bs-primary-rgb), 0.6);
      animation: grow 8s cubic-bezier(0.1, 0.7, 0.2, 1) forwards;
    }
    .done .bar { animation: finish 0.25s ease-out forwards; }
    @keyframes grow { from { transform: scaleX(0.05); } to { transform: scaleX(0.9); } }
    @keyframes finish { from { transform: scaleX(0.9); opacity: 1; } to { transform: scaleX(1); opacity: 0; } }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RouteProgress {
  protected readonly state = signal<'idle' | 'running' | 'done'>('idle');
  private showTimer: ReturnType<typeof setTimeout> | undefined;
  private hideTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    const sub = inject(Router).events.subscribe((e) => {
      if (e instanceof NavigationStart) {
        clearTimeout(this.hideTimer);
        clearTimeout(this.showTimer);
        this.showTimer = setTimeout(() => this.state.set('running'), 120);
      } else if (
        e instanceof NavigationEnd ||
        e instanceof NavigationCancel ||
        e instanceof NavigationError
      ) {
        clearTimeout(this.showTimer);
        if (this.state() === 'running') {
          this.state.set('done');
          this.hideTimer = setTimeout(() => this.state.set('idle'), 260);
        }
      }
    });
    inject(DestroyRef).onDestroy(() => sub.unsubscribe());
  }
}
