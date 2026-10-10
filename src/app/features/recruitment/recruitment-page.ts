import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CandidateService, DepartmentService, JobService } from '../../core/data';
import {
  Candidate,
  CANDIDATE_STAGES,
  CandidateStage,
  EMPLOYMENT_TYPES,
  EmploymentType,
  JobOpening,
  JobStatus,
} from '../../core/models';
import { ConfirmService } from '../../core/services/confirm.service';
import { ToastService } from '../../core/services/toast.service';
import { addDays, todayIso } from '../../core/utils/date.utils';
import {
  Avatar,
  CompactPipe,
  EmptyState,
  FieldError,
  LabelPipe,
  Modal,
  PageHeader,
  Rating,
  RelativeDatePipe,
  Skeleton,
  StatCard,
  StatusBadge,
} from '../../shared';

@Component({
  selector: 'app-recruitment-page',
  imports: [
    ReactiveFormsModule,
    PageHeader,
    StatCard,
    StatusBadge,
    Avatar,
    Rating,
    Modal,
    FieldError,
    Skeleton,
    EmptyState,
    LabelPipe,
    RelativeDatePipe,
    CompactPipe,
  ],
  templateUrl: './recruitment-page.html',
  styleUrl: './recruitment-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class RecruitmentPage {
  protected readonly jobs = inject(JobService);
  protected readonly candidates = inject(CandidateService);
  protected readonly departments = inject(DepartmentService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly jobModal = viewChild.required<Modal>('jobModal');
  private readonly candidateModal = viewChild.required<Modal>('candidateModal');

  protected readonly stages = CANDIDATE_STAGES;
  protected readonly types = EMPLOYMENT_TYPES;
  protected readonly tab = signal<'pipeline' | 'jobs'>('pipeline');
  protected readonly jobFilter = signal('');
  protected readonly loaded = computed(
    () => this.jobs.loaded() && this.candidates.loaded() && this.departments.loaded(),
  );

  // ---- Stats ----------------------------------------------------------------
  protected readonly stats = computed(() => {
    const c = this.candidates.items();
    const open = this.jobs.items().filter((j) => j.status === 'open');
    return {
      openJobs: open.length,
      openings: open.reduce((s, j) => s + j.openings, 0),
      active: c.filter((x) => !['hired', 'rejected'].includes(x.stage)).length,
      interviews: c.filter((x) => x.stage === 'interview').length,
      hired: c.filter((x) => x.stage === 'hired').length,
    };
  });

  // ---- Pipeline -------------------------------------------------------------
  protected readonly columns = computed(() => {
    const job = this.jobFilter();
    const list = this.candidates.items().filter((c) => !job || c.jobId === job);
    return this.stages.map((s) => ({
      ...s,
      items: list.filter((c) => c.stage === s.stage).sort((a, b) => b.appliedOn.localeCompare(a.appliedOn)),
    }));
  });

  protected readonly dragging = signal<Candidate | null>(null);
  protected readonly dropTarget = signal<CandidateStage | null>(null);

  protected readonly jobCards = computed(() =>
    [...this.jobs.items()]
      .sort((a, b) => (a.status === 'open' ? -1 : 1) - (b.status === 'open' ? -1 : 1) || b.postedOn.localeCompare(a.postedOn))
      .map((job) => {
        const applicants = this.candidates.items().filter((c) => c.jobId === job.id);
        return {
          job,
          applicants: applicants.length,
          inProgress: applicants.filter((c) => !['hired', 'rejected'].includes(c.stage)).length,
          hired: applicants.filter((c) => c.stage === 'hired').length,
        };
      }),
  );

  // ---- Forms ----------------------------------------------------------------
  protected readonly editingJob = signal<JobOpening | null>(null);
  protected readonly saving = signal(false);
  protected readonly jobForm = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(80)]],
    departmentId: ['', Validators.required],
    location: ['', Validators.required],
    employmentType: ['full-time' as EmploymentType],
    openings: [1, [Validators.required, Validators.min(1), Validators.max(50)]],
    status: ['open' as JobStatus],
    closingOn: [addDays(todayIso(), 30), Validators.required],
    salaryMin: [60000, [Validators.required, Validators.min(0)]],
    salaryMax: [80000, [Validators.required, Validators.min(0)]],
    experience: ['2+ years'],
    description: ['', Validators.maxLength(600)],
  });

  protected readonly candidateForm = this.fb.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    jobId: ['', Validators.required],
    source: ['LinkedIn'],
    experienceYears: [2, [Validators.min(0), Validators.max(50)]],
    rating: [3],
    notes: [''],
  });

  constructor() {
    this.jobs.ensureLoaded();
    this.candidates.ensureLoaded();
    this.departments.ensureLoaded();
  }

  protected jobTitle(id: string): string {
    return this.jobs.byId().get(id)?.title ?? '—';
  }

  protected deptName(id: string): string {
    return this.departments.nameOf(id);
  }

  // ---- Drag & drop ----------------------------------------------------------
  protected onDragStart(e: DragEvent, c: Candidate): void {
    this.dragging.set(c);
    e.dataTransfer?.setData('text/plain', c.id);
    if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
  }

  protected onDragOver(e: DragEvent, stage: CandidateStage): void {
    if (!this.dragging()) return;
    e.preventDefault();
    if (this.dropTarget() !== stage) this.dropTarget.set(stage);
  }

  protected onDrop(e: DragEvent, stage: CandidateStage): void {
    e.preventDefault();
    const c = this.dragging();
    this.dragging.set(null);
    this.dropTarget.set(null);
    if (c && c.stage !== stage) this.move(c, stage);
  }

  protected onDragEnd(): void {
    this.dragging.set(null);
    this.dropTarget.set(null);
  }

  protected move(c: Candidate, stage: CandidateStage): void {
    this.candidates.moveTo(c, stage).subscribe(() => {
      const label = this.stages.find((s) => s.stage === stage)?.label;
      this.toast.success(`${c.name} moved to ${label}.`);
    });
  }

  // ---- Jobs -----------------------------------------------------------------
  protected openJob(job?: JobOpening): void {
    this.editingJob.set(job ?? null);
    this.jobForm.reset(
      job
        ? { ...job }
        : {
            title: '',
            departmentId: '',
            location: '',
            employmentType: 'full-time',
            openings: 1,
            status: 'open',
            closingOn: addDays(todayIso(), 30),
            salaryMin: 60000,
            salaryMax: 80000,
            experience: '2+ years',
            description: '',
          },
    );
    this.jobModal().open();
  }

  protected saveJob(): void {
    const v = this.jobForm.getRawValue();
    if (this.jobForm.invalid) {
      this.jobForm.markAllAsTouched();
      return;
    }
    if (Number(v.salaryMax) < Number(v.salaryMin)) {
      this.toast.warning('Maximum salary must be greater than the minimum.');
      return;
    }
    const editing = this.editingJob();
    this.saving.set(true);
    const payload = { ...v, openings: Number(v.openings), salaryMin: Number(v.salaryMin), salaryMax: Number(v.salaryMax) };
    const req = editing ? this.jobs.update(editing.id, payload) : this.jobs.create({ ...payload, postedOn: todayIso() });
    req.subscribe({
      next: (j) => {
        this.saving.set(false);
        this.jobModal().close();
        this.toast.success(`${j.title} ${editing ? 'updated' : 'published'}.`);
      },
      error: () => this.saving.set(false),
    });
  }

  protected setJobStatus(job: JobOpening, status: JobStatus): void {
    this.jobs.update(job.id, { status }).subscribe(() => this.toast.info(`${job.title} is now ${status.replace('-', ' ')}.`));
  }

  protected async removeJob(job: JobOpening): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'Delete job opening',
      message: `Delete “${job.title}” and all of its candidates?`,
      confirmText: 'Delete',
      icon: 'bi-trash3',
    });
    if (!ok) return;
    this.jobs.remove(job.id).subscribe(() => {
      this.candidates.load(true);
      this.toast.success('Job opening deleted.');
    });
  }

  protected viewPipeline(job: JobOpening): void {
    this.jobFilter.set(job.id);
    this.tab.set('pipeline');
  }

  // ---- Candidates -----------------------------------------------------------
  protected openCandidate(): void {
    const firstOpen = this.jobs.items().find((j) => j.status === 'open');
    this.candidateForm.reset({
      name: '',
      email: '',
      phone: '',
      jobId: this.jobFilter() || firstOpen?.id || '',
      source: 'LinkedIn',
      experienceYears: 2,
      rating: 3,
      notes: '',
    });
    this.candidateModal().open();
  }

  protected saveCandidate(): void {
    if (this.candidateForm.invalid) {
      this.candidateForm.markAllAsTouched();
      return;
    }
    const v = this.candidateForm.getRawValue();
    this.saving.set(true);
    this.candidates
      .create({ ...v, experienceYears: Number(v.experienceYears), stage: 'applied', appliedOn: todayIso() })
      .subscribe({
        next: (c) => {
          this.saving.set(false);
          this.candidateModal().close();
          this.toast.success(`${c.name} added to the pipeline.`);
        },
        error: () => this.saving.set(false),
      });
  }

  protected async removeCandidate(c: Candidate): Promise<void> {
    const ok = await this.confirm.ask({ title: 'Remove candidate', message: `Remove ${c.name} from the pipeline?`, confirmText: 'Remove' });
    if (ok) this.candidates.remove(c.id).subscribe(() => this.toast.success(`${c.name} removed.`));
  }
}
