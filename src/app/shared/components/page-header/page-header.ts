import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

export interface Crumb {
  label: string;
  link?: string;
}

/**
 * Page title row with optional breadcrumbs. Action buttons are projected:
 *   <app-page-header title="Employees"><button class="btn btn-primary">Add</button></app-page-header>
 */
@Component({
  selector: 'app-page-header',
  imports: [RouterLink],
  template: `
    <div class="d-flex flex-column flex-md-row align-items-md-end justify-content-between gap-3 mb-4">
      <div class="min-w-0">
        @if (breadcrumbs().length) {
          <nav aria-label="breadcrumb">
            <ol class="breadcrumb small mb-1">
              @for (c of breadcrumbs(); track c.label) {
                @if (c.link) {
                  <li class="breadcrumb-item"><a [routerLink]="c.link">{{ c.label }}</a></li>
                } @else {
                  <li class="breadcrumb-item active" aria-current="page">{{ c.label }}</li>
                }
              }
            </ol>
          </nav>
        }
        <h1 class="h3 mb-1 text-truncate">{{ title() }}</h1>
        @if (subtitle()) {
          <p class="text-body-secondary mb-0">{{ subtitle() }}</p>
        }
      </div>
      <div class="d-flex flex-wrap gap-2 align-items-center">
        <ng-content />
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageHeader {
  readonly title = input.required<string>();
  readonly subtitle = input<string>('');
  readonly breadcrumbs = input<Crumb[]>([]);
}
