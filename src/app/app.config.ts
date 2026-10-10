import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, inject, provideBrowserGlobalErrorListeners } from '@angular/core';
import {
  PreloadAllModules,
  provideRouter,
  Router,
  TitleStrategy,
  ViewTransitionInfo,
  withComponentInputBinding,
  withInMemoryScrolling,
  withPreloading,
  withViewTransitions,
} from '@angular/router';

import { routes } from './app.routes';
import { authInterceptor } from './core/http/auth.interceptor';
import { errorInterceptor } from './core/http/error.interceptor';
import { mockApiInterceptor } from './core/mock-api/mock-api.interceptor';
import { PageTitleStrategy } from './core/services/page-title.strategy';

/** Skip the route animation when only query params change (filters, tabs). */
function onViewTransitionCreated({ transition }: ViewTransitionInfo): void {
  const router = inject(Router);
  const target = router.currentNavigation()?.finalUrl;
  if (
    target &&
    router.isActive(target, {
      paths: 'exact',
      matrixParams: 'exact',
      fragment: 'ignored',
      queryParams: 'ignored',
    })
  ) {
    transition.skipTransition();
  }
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withComponentInputBinding(),
      // Feature chunks are downloaded in the background after first load → instant navigation
      withPreloading(PreloadAllModules),
      withViewTransitions({ skipInitialTransition: true, onViewTransitionCreated }),
      withInMemoryScrolling({ scrollPositionRestoration: 'top', anchorScrolling: 'enabled' }),
    ),
    provideHttpClient(
      withFetch(),
      // Order matters: auth header → global error handling → (mock) backend
      withInterceptors([authInterceptor, errorInterceptor, mockApiInterceptor]),
    ),
    { provide: TitleStrategy, useClass: PageTitleStrategy },
  ],
};
