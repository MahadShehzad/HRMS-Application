import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  template: `
    <div class="text-center py-5 px-3">
      <div class="icon-box icon-box-lg bg-body-secondary text-body-secondary mx-auto mb-3 rounded-circle">
        <i class="bi {{ icon() }}"></i>
      </div>
      <h2 class="h6 mb-1">{{ title() }}</h2>
      @if (message()) {
        <p class="text-body-secondary small mb-3 mx-auto" style="max-width: 360px">{{ message() }}</p>
      }
      <ng-content />
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmptyState {
  readonly icon = input('bi-inbox');
  readonly title = input('Nothing here yet');
  readonly message = input('');
}
