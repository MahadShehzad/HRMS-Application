import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Shimmer placeholders that mirror the real layout, so content doesn't jump
 * when it arrives.
 *   <app-skeleton variant="table" [rows]="8" [cols]="5" />
 */
@Component({
  selector: 'app-skeleton',
  template: `
    @switch (variant()) {
      @case ('table') {
        <div class="table-responsive" aria-busy="true" aria-label="Loading">
          <table class="table table-hr">
            <thead>
              <tr>
                @for (c of colList(); track $index) {
                  <th><span class="skeleton skeleton-text my-1" style="width: 60%"></span></th>
                }
              </tr>
            </thead>
            <tbody>
              @for (r of rowList(); track $index; let ri = $index) {
                <tr>
                  @for (c of colList(); track $index; let first = $first) {
                    <td>
                      @if (first) {
                        <div class="d-flex align-items-center gap-2">
                          <span class="skeleton skeleton-circle" style="width: 2rem; height: 2rem"></span>
                          <div class="flex-grow-1">
                            <span class="skeleton skeleton-text" style="width: 70%"></span>
                            <span class="skeleton skeleton-text mb-0" style="width: 45%"></span>
                          </div>
                        </div>
                      } @else {
                        <span class="skeleton skeleton-text mb-0" [style.width.%]="50 + (($index * 17 + ri * 7) % 40)"></span>
                      }
                    </td>
                  }
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
      @case ('cards') {
        <div class="row g-3" aria-busy="true" aria-label="Loading">
          @for (r of rowList(); track $index) {
            <div [class]="colClass()">
              <div class="card h-100">
                <div class="card-body">
                  <div class="d-flex align-items-center gap-3 mb-3">
                    <span class="skeleton skeleton-circle" style="width: 2.75rem; height: 2.75rem"></span>
                    <div class="flex-grow-1">
                      <span class="skeleton skeleton-text" style="width: 65%"></span>
                      <span class="skeleton skeleton-text mb-0" style="width: 40%"></span>
                    </div>
                  </div>
                  <span class="skeleton skeleton-text"></span>
                  <span class="skeleton skeleton-text" style="width: 80%"></span>
                </div>
              </div>
            </div>
          }
        </div>
      }
      @case ('list') {
        <ul class="list-unstyled mb-0" aria-busy="true" aria-label="Loading">
          @for (r of rowList(); track $index) {
            <li class="d-flex align-items-center gap-3 py-2">
              <span class="skeleton skeleton-circle" style="width: 2.25rem; height: 2.25rem"></span>
              <div class="flex-grow-1">
                <span class="skeleton skeleton-text" style="width: 55%"></span>
                <span class="skeleton skeleton-text mb-0" style="width: 30%"></span>
              </div>
            </li>
          }
        </ul>
      }
      @case ('chart') {
        <div class="d-flex align-items-end gap-2 px-2" style="height: 220px" aria-busy="true" aria-label="Loading">
          @for (r of rowList(); track $index) {
            <span class="skeleton flex-grow-1" [style.height.%]="30 + (($index * 37) % 65)"></span>
          }
        </div>
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Skeleton {
  readonly variant = input<'table' | 'cards' | 'list' | 'chart'>('table');
  readonly rows = input(6);
  readonly cols = input(5);
  readonly colClass = input('col-12 col-md-6 col-xl-4');

  protected readonly rowList = computed(() => Array.from({ length: this.rows() }));
  protected readonly colList = computed(() => Array.from({ length: this.cols() }));
}
