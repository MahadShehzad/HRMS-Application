import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { NavigationCancel, NavigationEnd, NavigationError, Router, RouterOutlet } from '@angular/router';
import { filter, take } from 'rxjs';
import { PreferencesService } from './core/services/preferences.service';
import { ConfirmDialog } from './shared/components/confirm-dialog/confirm-dialog';
import { RouteProgress } from './shared/components/route-progress/route-progress';
import { ToastContainer } from './shared/components/toast-container/toast-container';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouteProgress, ToastContainer, ConfirmDialog],
  template: `
    <app-route-progress />
    <router-outlet />
    <app-toast-container />
    <app-confirm-dialog />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  constructor() {
    // Instantiate early so the saved theme is applied before first paint
    inject(PreferencesService);

    // Fade out the HTML splash once the first route has rendered
    const sub = inject(Router)
      .events.pipe(
        filter((e) => e instanceof NavigationEnd || e instanceof NavigationCancel || e instanceof NavigationError),
        take(1),
      )
      .subscribe(() => requestAnimationFrame(() => hideSplash()));
    inject(DestroyRef).onDestroy(() => sub.unsubscribe());
  }
}

function hideSplash(): void {
  const splash = document.getElementById('app-splash');
  if (!splash) return;
  splash.classList.add('is-hidden');
  splash.addEventListener('transitionend', () => splash.remove(), { once: true });
  setTimeout(() => splash.remove(), 600);
}
