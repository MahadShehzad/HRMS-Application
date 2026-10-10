import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found-page',
  imports: [RouterLink],
  template: `
    <div class="min-vh-100 d-flex align-items-center justify-content-center p-4 text-center">
      <div style="max-width: 440px">
        <div class="display-1 fw-bold text-primary opacity-25 lh-1 mb-2">404</div>
        <h1 class="h3 mb-2">Page not found</h1>
        <p class="text-body-secondary mb-4">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <a routerLink="/dashboard" class="btn btn-primary"><i class="bi bi-house me-2"></i>Back to dashboard</a>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class NotFoundPage {}
