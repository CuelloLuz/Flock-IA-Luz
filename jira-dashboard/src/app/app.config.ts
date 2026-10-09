import { ApplicationConfig, provideBrowserGlobalErrorListeners, APP_INITIALIZER } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch, HttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { firstValueFrom } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { of } from 'rxjs';

import { routes } from './app.routes';
import { JiraService } from './core/services/jira';
import { AuthService } from './core/services/auth.service';
import { environment } from '../environments/environment';

function initApp(jira: JiraService, auth: AuthService) {
  return async () => {
    // 1️⃣ Intentar OAuth (BFF activo)
    const oauthState = await firstValueFrom(auth.check());
    if (oauthState.authenticated) {
      jira.configureOAuth(environment.jira.projectKey || 'SCRUM');
      return;
    }

    // 2️⃣ Fallback: Basic Auth via proxy si Jira está configurado en el servidor.
    //    Las credenciales nunca llegan al navegador.
    if (environment.jira.enabled) {
      jira.configure(environment.jira.projectKey || 'SCRUM');
      return;
    }

    // 3️⃣ Sin Jira configurado → modo mock (default)
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withFetch()),
    provideAnimationsAsync(),
    {
      provide: APP_INITIALIZER,
      useFactory: initApp,
      deps: [JiraService, AuthService],
      multi: true,
    },
  ],
};
