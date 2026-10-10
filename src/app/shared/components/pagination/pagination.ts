import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';

/** Bootstrap pagination with a "Showing x–y of z" summary and page-size picker. */
@Component({
  selector: 'app-pagination',
  template: `
    <div class="d-flex flex-column flex-sm-row align-items-center justify-content-between gap-2">
      <div class="d-flex align-items-center gap-2 small text-body-secondary">
        <span>Showing {{ from() }}–{{ to() }} of {{ total() }}</span>
        <select class="form-select form-select-sm w-auto" aria-label="Rows per page"
                [value]="pageSize()" (change)="setSize($any($event.target).value)">
          @for (s of sizes; track s) {
            <option [value]="s">{{ s }} / page</option>
          }
        </select>
      </div>
      @if (pageCount() > 1) {
        <nav aria-label="Pagination">
          <ul class="pagination pagination-sm mb-0">
            <li class="page-item" [class.disabled]="page() === 1">
              <button class="page-link" (click)="go(page() - 1)" aria-label="Previous">
                <i class="bi bi-chevron-left"></i>
              </button>
            </li>
            @for (p of pages(); track $index) {
              @if (p === 0) {
                <li class="page-item disabled"><span class="page-link">…</span></li>
              } @else {
                <li class="page-item" [class.active]="p === page()">
                  <button class="page-link" (click)="go(p)">{{ p }}</button>
                </li>
              }
            }
            <li class="page-item" [class.disabled]="page() === pageCount()">
              <button class="page-link" (click)="go(page() + 1)" aria-label="Next">
                <i class="bi bi-chevron-right"></i>
              </button>
            </li>
          </ul>
        </nav>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Pagination {
  readonly total = input.required<number>();
  readonly page = model(1);
  readonly pageSize = model(10);
  protected readonly sizes = [10, 25, 50];

  protected readonly pageCount = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize())));
  protected readonly from = computed(() => (this.total() ? (this.page() - 1) * this.pageSize() + 1 : 0));
  protected readonly to = computed(() => Math.min(this.total(), this.page() * this.pageSize()));

  /** Page numbers with 0 as an ellipsis marker. */
  protected readonly pages = computed(() => {
    const count = this.pageCount();
    const cur = this.page();
    if (count <= 7) return Array.from({ length: count }, (_, i) => i + 1);
    const set = new Set([1, 2, cur - 1, cur, cur + 1, count - 1, count].filter((p) => p >= 1 && p <= count));
    const sorted = [...set].sort((a, b) => a - b);
    const out: number[] = [];
    sorted.forEach((p, i) => {
      if (i && p - sorted[i - 1] > 1) out.push(0);
      out.push(p);
    });
    return out;
  });

  protected go(p: number): void {
    this.page.set(Math.min(this.pageCount(), Math.max(1, p)));
  }

  protected setSize(size: string): void {
    this.pageSize.set(Number(size));
    this.page.set(1);
  }
}
