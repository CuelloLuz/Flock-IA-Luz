import { Component, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';

import { AuthService } from './core/services/auth.service';
import { JiraService } from './core/services/jira';

interface NavItem {
  icon: string;
  label: string;
  route: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet, RouterLink, RouterLinkActive,
    MatSidenavModule, MatToolbarModule, MatListModule,
    MatIconModule, MatButtonModule, MatDividerModule,
    MatTooltipModule, MatChipsModule,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  readonly auth   = inject(AuthService);
  readonly jira   = inject(JiraService);
  readonly router = inject(Router);

  get isLoginPage(): boolean {
    return this.router.url === '/login' || this.router.url === '/';
  }

  logout(): void {
    sessionStorage.removeItem('auth');
    this.router.navigate(['/login']);
  }

  readonly navItems: NavItem[] = [
    { icon: 'dashboard', label: 'Tablero',  route: '/dashboard' },
    { icon: 'task_alt',  label: 'Tareas',   route: '/tasks' },
    { icon: 'bar_chart', label: 'Reportes', route: '/reports' },
  ];

  get authBadge(): string {
    const mode = this.jira.authMode;
    if (mode === 'oauth')  return 'OAuth 2.0';
    if (mode === 'basic')  return 'Basic Auth';
    return 'Mock';
  }

  get authBadgeClass(): string {
    const mode = this.jira.authMode;
    if (mode === 'oauth')  return 'badge-oauth';
    if (mode === 'basic')  return 'badge-basic';
    return 'badge-mock';
  }

  get userInitials(): string {
    const name = this.auth.state()?.user?.displayName ?? 'Luz Cuello';
    return name.split(' ').slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase();
  }

  get userName(): string {
    return this.auth.state()?.user?.displayName ?? 'Luz Cuello';
  }

  get siteName(): string {
    return this.auth.state()?.siteName ?? 'flockit-luz.atlassian.net';
  }
}
