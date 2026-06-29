import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { PreloadAllModules, RouteReuseStrategy, provideRouter, withPreloading, withViewTransitions, withRouterConfig, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { loadingInterceptor } from './core/interceptors/loading.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { AppRouteReuseStrategy } from './core/strategies/app-route-reuse.strategy';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(
      routes,
      withPreloading(PreloadAllModules),
      withRouterConfig({ 
        onSameUrlNavigation: 'reload',
        paramsInheritanceStrategy: 'always'
      }),
      withInMemoryScrolling({ 
        scrollPositionRestoration: 'enabled',
        anchorScrolling: 'enabled'
      })
    ),
    provideHttpClient(withInterceptors([
      authInterceptor,
      loadingInterceptor,
      errorInterceptor
    ])),
    provideAnimationsAsync(),
    provideCharts(withDefaultRegisterables()),
    { provide: RouteReuseStrategy, useClass: AppRouteReuseStrategy }
  ]
};
