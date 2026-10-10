import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { navigationFor } from '../../core/constants/navigation';
import { AnnouncementService, EmployeeService, LeaveService } from '../../core/data';
import { fullName, ROLE_LABELS } from '../../core/models';
import { PreferencesService } from '../../core/services/preferences.service';
import { addDays, todayIso } from '../../core/utils/date.utils';
import { Avatar } from '../../shared/components/avatar/avatar';
import { RelativeDatePipe } from '../../shared/pipes/relative-date.pipe';

interface SearchResult {
  label: string;
  sub: string;
  icon?: string;
  avatar?: string;
  link: string;
}

@Component({
  selector: 'app-topbar',
  imports: [RouterLink, Avatar, RelativeDatePipe],
  templateUrl: './topbar.html',
  styleUrl: './topbar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown)': 'onKey($event)',
  },
})
export class Topbar {
  protected readonly auth = inject(AuthService);
  protected readonly prefs = inject(PreferencesService);
  private readonly router = inject(Router);
  private readonly employees = inject(EmployeeService);
  private readonly leaves = inject(LeaveService);
  private readonly announcements = inject(AnnouncementService);
  private readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('search');

  protected readonly roleLabels = ROLE_LABELS;
  protected readonly query = signal('');
  protected readonly searchOpen = signal(false);
  protected readonly isMac = /Mac|iPhone|iPad/.test(navigator.platform);

  protected readonly results = computed<SearchResult[]>(() => {
    const q = this.query().trim().toLowerCase();
    if (q.length < 2) return [];
    const pages = navigationFor(this.auth.role())
      .flatMap((g) => g.items)
      .filter((i) => i.label.toLowerCase().includes(q))
      .map((i) => ({ label: i.label, sub: 'Page', icon: i.icon, link: i.route }));
    const people = this.employees
      .items()
      .filter((e) => `${fullName(e)} ${e.email} ${e.code} ${e.designation}`.toLowerCase().includes(q))
      .slice(0, 6)
      .map((e) => ({ label: fullName(e), sub: `${e.designation} · ${e.code}`, avatar: fullName(e), link: `/employees/${e.id}` }));
    return [...pages, ...people];
  });

  protected readonly pendingLeaves = computed(() =>
    this.auth.isManager() ? this.leaves.pending().slice(0, 5) : [],
  );
  protected readonly recentNews = computed(() => {
    const since = addDays(todayIso(), -7);
    return this.announcements
      .items()
      .filter((a) => a.publishedOn >= since)
      .sort((a, b) => b.publishedOn.localeCompare(a.publishedOn))
      .slice(0, 3);
  });
  protected readonly notificationCount = computed(
    () => this.pendingLeaves().length + this.recentNews().length,
  );

  constructor() {
    this.employees.ensureLoaded();
    this.announcements.ensureLoaded();
    if (this.auth.isManager()) this.leaves.ensureLoaded();
  }

  protected nameOf(id: string): string {
    return this.employees.nameOf(id);
  }

  protected go(result: SearchResult | undefined): void {
    if (!result) return;
    this.router.navigateByUrl(result.link);
    this.closeSearch();
  }

  protected closeSearch(): void {
    this.query.set('');
    this.searchOpen.set(false);
    this.searchInput()?.nativeElement.blur();
  }

  /** Ctrl/⌘ + K or "/" focuses global search. */
  protected onKey(e: KeyboardEvent): void {
    const target = e.target as HTMLElement;
    const typing = /INPUT|TEXTAREA|SELECT/.test(target.tagName) || target.isContentEditable;
    const isK = e.key?.toLowerCase() === 'k'; // Caps Lock sends "K"
    if ((isK && (e.ctrlKey || e.metaKey)) || (e.key === '/' && !typing)) {
      e.preventDefault();
      this.searchInput()?.nativeElement.focus();
    }
  }

  protected blurLater(): void {
    // Allow clicks on results to register before the list disappears
    setTimeout(() => this.searchOpen.set(false), 150);
  }
}
