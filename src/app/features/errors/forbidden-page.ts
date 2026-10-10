import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-forbidden-page',
  imports: [RouterLink],
  template: `
    <div class="d-flex align-items-center justify-content-center py-5 text-center">
      <div style="max-width: 440px">
        <div class="icon-box icon-box-lg rounded-circle bg-danger-subtle text-danger-emphasis mx-auto mb-3">
          <i class="bi bi-shield-lock"></i>
        </div>
        <h1 class="h3 mb-2">Access denied</h1>
        <p class="text-body-secondary mb-4">
          You don't have permission to view this page. Contact your administrator if you think this is a mistake.
        </p>
        <a routerLink="/dashboard" class="btn btn-primary">Go to dashboard</a>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class ForbiddenPage {}
