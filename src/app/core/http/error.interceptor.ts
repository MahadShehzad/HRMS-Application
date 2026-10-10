import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { ToastService } from '../services/toast.service';
import { SILENT_ERRORS } from './http-context';

/** Extracts a human-readable message from any HTTP error. */
export function errorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 0) return 'Cannot reach the server. Check your connection.';
    return err.error?.message ?? err.statusText ?? 'Request failed';
  }
  return err instanceof Error ? err.message : 'Something went wrong';
}

/**
 * Central error handling:
 *  - 401 → session ended, sign the user out
 *  - anything else → error toast (unless the request opted out via SILENT_ERRORS)
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const toast = inject(ToastService);

  return next(req).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse && err.status === 401 && !req.url.endsWith('/auth/login')) {
        if (auth.isAuthenticated()) {
          toast.warning('Your session has ended. Please sign in again.');
          auth.logout();
        }
      } else if (!req.context.get(SILENT_ERRORS)) {
        toast.error(errorMessage(err));
      }
      return throwError(() => err);
    }),
  );
};
