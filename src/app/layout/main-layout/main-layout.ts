import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { environment } from '../../../environments/environment';
import { PreferencesService } from '../../core/services/preferences.service';
import { Sidebar } from '../sidebar/sidebar';
import { Topbar } from '../topbar/topbar';

/** Authenticated application shell: sidebar + topbar + routed content. */
@Component({
  selector: 'app-main-layout',
  imports: [RouterOutlet, Sidebar, Topbar],
  template: `
    <a class="visually-hidden-focusable position-absolute m-2 btn btn-primary" href="#main-content">Skip to content</a>
    <app-sidebar />
    <div class="app-main" [class.sidebar-collapsed]="prefs.sidebarCollapsed()">
      <app-topbar />
      <main id="main-content" class="app-content" tabindex="-1">
        <router-outlet />
      </main>
      <footer class="app-footer small text-body-secondary d-print-hide">
        <span>© {{ year }} {{ appName }}</span>
        <span class="d-none d-sm-inline">v1.0.0 · All systems operational <span class="status-dot text-success ms-1"></span></span>
      </footer>
    </div>
  `,
  styleUrl: './main-layout.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainLayout {
  protected readonly prefs = inject(PreferencesService);
  protected readonly appName = environment.appName;
  protected readonly year = new Date().getFullYear();
}
