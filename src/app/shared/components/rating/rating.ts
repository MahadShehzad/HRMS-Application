import { ChangeDetectionStrategy, Component, input, model, signal } from '@angular/core';

/** 1–5 star rating; read-only by default, editable with `[readonly]="false"`. */
@Component({
  selector: 'app-rating',
  template: `
    <span class="d-inline-flex gap-1 align-items-center" role="img"
          [attr.aria-label]="value() + ' out of 5'" (mouseleave)="hover.set(0)">
      @for (s of stars; track s) {
        @if (readonly()) {
          <i class="bi" [class]="(s <= value() ? 'bi-star-fill text-warning' : 'bi-star text-body-tertiary')"></i>
        } @else {
          <button type="button" class="btn btn-link p-0 lh-1 text-decoration-none"
                  [attr.aria-label]="'Rate ' + s" (mouseenter)="hover.set(s)" (click)="value.set(s)">
            <i class="bi fs-5" [class]="(s <= (hover() || value()) ? 'bi-star-fill text-warning' : 'bi-star text-body-tertiary')"></i>
          </button>
        }
      }
    </span>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Rating {
  readonly value = model(0);
  readonly readonly = input(true);
  protected readonly hover = signal(0);
  protected readonly stars = [1, 2, 3, 4, 5];
}
