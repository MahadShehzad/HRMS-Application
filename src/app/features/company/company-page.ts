import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/auth/auth.service';
import { AnnouncementService, EmployeeService, HolidayService } from '../../core/data';
import { Announcement, AnnouncementCategory, Holiday, HolidayType } from '../../core/models';
import { ConfirmService } from '../../core/services/confirm.service';
import { ToastService } from '../../core/services/toast.service';
import { todayIso } from '../../core/utils/date.utils';
import {
  Avatar,
  EmptyState,
  FieldError,
  LabelPipe,
  Modal,
  PageHeader,
  RelativeDatePipe,
  Skeleton,
  StatusBadge,
} from '../../shared';

@Component({
  selector: 'app-company-page',
  imports: [
    DatePipe,
    ReactiveFormsModule,
    PageHeader,
    Avatar,
    StatusBadge,
    Modal,
    FieldError,
    Skeleton,
    EmptyState,
    LabelPipe,
    RelativeDatePipe,
  ],
  templateUrl: './company-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class CompanyPage {
  protected readonly auth = inject(AuthService);
  protected readonly announcements = inject(AnnouncementService);
  protected readonly holidays = inject(HolidayService);
  private readonly employees = inject(EmployeeService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly postModal = viewChild.required<Modal>('postModal');
  private readonly holidayModal = viewChild.required<Modal>('holidayModal');

  protected readonly categories: AnnouncementCategory[] = ['general', 'policy', 'event', 'urgent'];
  protected readonly category = signal<AnnouncementCategory | ''>('');
  protected readonly today = todayIso();
  protected readonly saving = signal(false);
  protected readonly editing = signal<Announcement | null>(null);

  protected readonly feed = computed(() =>
    this.announcements
      .items()
      .filter((a) => !this.category() || a.category === this.category())
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.publishedOn.localeCompare(a.publishedOn)),
  );

  /** Holidays grouped by month, upcoming first, then past (dimmed). */
  protected readonly holidayGroups = computed(() => {
    const sorted = [...this.holidays.items()].sort((a, b) => a.date.localeCompare(b.date));
    const groups = new Map<string, Holiday[]>();
    for (const h of sorted) {
      const key = h.date.slice(0, 7);
      groups.set(key, [...(groups.get(key) ?? []), h]);
    }
    return [...groups.entries()].map(([month, items]) => ({ month: `${month}-01`, items }));
  });

  protected readonly upcomingCount = computed(() => this.holidays.items().filter((h) => h.date >= this.today).length);

  protected readonly postForm = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(120)]],
    body: ['', [Validators.required, Validators.maxLength(2000)]],
    category: ['general' as AnnouncementCategory],
    pinned: [false],
  });

  protected readonly holidayForm = this.fb.group({
    name: ['', Validators.required],
    date: ['', Validators.required],
    type: ['public' as HolidayType],
  });

  constructor() {
    this.announcements.ensureLoaded();
    this.holidays.ensureLoaded();
    this.employees.ensureLoaded();
  }

  protected nameOf(id: string): string {
    return this.employees.nameOf(id);
  }

  protected openPost(a?: Announcement): void {
    this.editing.set(a ?? null);
    this.postForm.reset(a ? { ...a } : { title: '', body: '', category: 'general', pinned: false });
    this.postModal().open();
  }

  protected savePost(): void {
    if (this.postForm.invalid) {
      this.postForm.markAllAsTouched();
      return;
    }
    const editing = this.editing();
    this.saving.set(true);
    const req = editing
      ? this.announcements.update(editing.id, this.postForm.getRawValue())
      : this.announcements.create({
          ...this.postForm.getRawValue(),
          authorId: this.auth.user()!.employeeId,
          publishedOn: todayIso(),
        });
    req.subscribe({
      next: () => {
        this.saving.set(false);
        this.postModal().close();
        this.toast.success(editing ? 'Announcement updated.' : 'Announcement published to everyone.');
      },
      error: () => this.saving.set(false),
    });
  }

  protected togglePin(a: Announcement): void {
    this.announcements.update(a.id, { pinned: !a.pinned }).subscribe();
  }

  protected async removePost(a: Announcement): Promise<void> {
    const ok = await this.confirm.ask({ title: 'Delete announcement', message: `Delete “${a.title}”?`, confirmText: 'Delete' });
    if (ok) this.announcements.remove(a.id).subscribe(() => this.toast.success('Announcement deleted.'));
  }

  protected openHoliday(): void {
    this.holidayForm.reset({ name: '', date: '', type: 'public' });
    this.holidayModal().open();
  }

  protected saveHoliday(): void {
    if (this.holidayForm.invalid) {
      this.holidayForm.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.holidays.create(this.holidayForm.getRawValue()).subscribe({
      next: (h) => {
        this.saving.set(false);
        this.holidayModal().close();
        this.toast.success(`${h.name} added to the holiday calendar.`);
      },
      error: () => this.saving.set(false),
    });
  }

  protected async removeHoliday(h: Holiday): Promise<void> {
    const ok = await this.confirm.ask({ title: 'Remove holiday', message: `Remove ${h.name} from the calendar?`, confirmText: 'Remove' });
    if (ok) this.holidays.remove(h.id).subscribe(() => this.toast.success('Holiday removed.'));
  }
}
