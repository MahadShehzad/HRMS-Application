import { HttpContext, HttpContextToken } from '@angular/common/http';

/** Set on a request when the caller handles errors itself (no global toast). */
export const SILENT_ERRORS = new HttpContextToken<boolean>(() => false);

export const silentErrors = () => new HttpContext().set(SILENT_ERRORS, true);
