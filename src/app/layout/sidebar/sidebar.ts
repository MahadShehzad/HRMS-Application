import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
} from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Offcanvas } from 'bootstrap';
import { filter } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/auth/auth.service';
import { navigationFor } from '../../core/constants/navigation';
import { LeaveService } from '../../core/data';
import { ROLE_LABELS } from '../../core/models';
import { PreferencesService } from '../../core/services/preferences.service';
import { Avatar } from '../../shared/components/avatar/avatar';
import { TooltipDirective } from '../../shared/directives/tooltip.directive';

/**
 * Primary navigation.
 *  - ≥ lg: fixed column, collapsible to an icon rail
 *  - < lg: Bootstrap off-canvas drawer (`.offcanvas-lg`)
 */
@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive, Avatar, TooltipDirective],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Sidebar {
  protected readonly auth = inject(AuthService);
  protected readonly prefs = inject(PreferencesService);
  private readonly leaves = inject(LeaveService);
  private readonly el = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement;

  protected readonly appName = environment.appName;
  protected readonly roleLabels = ROLE_LABELS;
  protected readonly groups = computed(() => navigationFor(this.auth.role()));
  protected readonly collapsed = this.prefs.sidebarCollapsed;
  protected readonly pendingLeaves = computed(() => this.leaves.pending().length);

  constructor() {
    if (this.auth.isManager()) this.leaves.ensureLoaded();

    // Close the mobile drawer after navigating
    const sub = inject(Router)
      .events.pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe(() => {
        const drawer = this.el.querySelector('#appSidebar');
        if (drawer) Offcanvas.getInstance(drawer)?.hide();
      });
    inject(DestroyRef).onDestroy(() => sub.unsubscribe());
  }

  protected badgeFor(key: string | undefined): number {
    return key === 'pendingLeaves' && this.auth.isManager() ? this.pendingLeaves() : 0;
  }
}
