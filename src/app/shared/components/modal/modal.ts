import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  OnDestroy,
  output,
  signal,
} from '@angular/core';
import { Modal as BsModal } from 'bootstrap';

/**
 * Angular wrapper around the Bootstrap modal (keeps Bootstrap's own
 * backdrop, focus trap and fade animation).
 *
 *   <app-modal #m title="Add employee" size="lg">
 *     …body…
 *     <ng-container modal-footer>…buttons…</ng-container>
 *   </app-modal>
 *   m.open() / m.close()
 *
 * The body is detached from the DOM while the modal is closed.
 */
@Component({
  selector: 'app-modal',
  template: `
    <div class="modal fade" tabindex="-1" aria-hidden="true" [attr.aria-labelledby]="titleId">
      <div class="modal-dialog modal-dialog-centered {{ sizeClass() }}" [class.modal-dialog-scrollable]="scrollable()">
        <div class="modal-content shadow-lg">
          <div class="modal-header">
            <div>
              <h2 class="modal-title h5" [id]="titleId">{{ title() }}</h2>
              @if (subtitle()) {
                <div class="small text-body-secondary">{{ subtitle() }}</div>
              }
            </div>
            <button type="button" class="btn-close" (click)="close()" aria-label="Close"></button>
          </div>
          @if (isOpen()) {
            <div class="modal-body">
              <ng-content />
            </div>
          }
          <div class="modal-footer">
            <ng-content select="[modal-footer]" />
          </div>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Modal implements OnDestroy {
  private static seq = 0;

  readonly title = input.required<string>();
  readonly subtitle = input('');
  readonly size = input<'sm' | 'md' | 'lg' | 'xl'>('md');
  readonly scrollable = input(true);
  /** Prevent closing by clicking the backdrop (e.g. forms with unsaved input). */
  readonly staticBackdrop = input(false);
  readonly closed = output<void>();

  protected readonly titleId = `modal-title-${++Modal.seq}`;
  protected readonly isOpen = signal(false);
  private readonly host = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement;
  private instance: BsModal | null = null;
  /** Captured on first access, before the element is moved to <body>. */
  private _modalEl: HTMLElement | null = null;

  private get modalEl(): HTMLElement {
    return (this._modalEl ??= this.host.querySelector('.modal') as HTMLElement);
  }

  protected sizeClass(): string {
    return this.size() === 'md' ? '' : `modal-${this.size()}`;
  }

  open(): void {
    const el = this.modalEl;
    if (!this.instance) {
      // Portal to <body>: ancestors with their own stacking context (e.g. the
      // view-transition content area) would otherwise trap the modal under
      // Bootstrap's body-level backdrop.
      document.body.appendChild(el);
      this.instance = new BsModal(el, {
        backdrop: this.staticBackdrop() ? 'static' : true,
        keyboard: true,
      });
      el.addEventListener('hidden.bs.modal', () => {
        this.isOpen.set(false);
        this.closed.emit();
      });
    }
    this.isOpen.set(true);
    this.instance.show();
  }

  close(): void {
    this.instance?.hide();
  }

  ngOnDestroy(): void {
    this.instance?.dispose();
    this.modalEl.remove();
    if (!this.isOpen()) return;
    // Destroyed while open (e.g. navigated away) — remove Bootstrap's body state
    document.querySelectorAll('.modal-backdrop').forEach((b) => b.remove());
    document.body.classList.remove('modal-open');
    document.body.style.removeProperty('overflow');
    document.body.style.removeProperty('padding-right');
  }
}
