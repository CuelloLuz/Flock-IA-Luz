import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export interface AuthUser {
  displayName: string;
  emailAddress: string;
  avatarUrl?: string;
}

export interface AuthState {
  authenticated: boolean;
  cloudId?: string;
  siteName?: string;
  siteUrl?: string;
  user?: AuthUser;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);

  readonly state        = signal<AuthState>({ authenticated: false });
  readonly bffAvailable = signal(false);

  check(): Observable<AuthState> {
    return this.http.get<AuthState>('/auth/me', { withCredentials: true }).pipe(
      map(s => {
        this.bffAvailable.set(true);
        this.state.set(s);
        return s;
      }),
      catchError((err) => {
        // 401 = BFF está disponible pero la sesión no existe/expiró → mostrar botón OAuth
        // Otro error = BFF no disponible (red, 503, etc.) → ocultar botón OAuth
        this.bffAvailable.set(err instanceof HttpErrorResponse && err.status === 401);
        this.state.set({ authenticated: false });
        return of({ authenticated: false });
      }),
    );
  }

  login(): void {
    window.location.href = '/auth/login';
  }

  logout(): void {
    this.http.post('/auth/logout', {}, { withCredentials: true }).subscribe(() => {
      this.state.set({ authenticated: false });
      window.location.href = '/';
    });
  }
}
