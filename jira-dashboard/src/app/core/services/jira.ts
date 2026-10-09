import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import {
  JiraIssue, JiraProject, JiraSprint, JiraUser,
  SearchResult, ProjectSearchResult,
  PendingItem, ActivityUpdate, Milestone,
} from '../models/jira.models';

export interface JiraConfig {
  baseUrl: string;
  email: string;
  apiToken: string;
  projectKey?: string;
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_USER: JiraUser = {
  accountId: 'mock-001',
  displayName: 'Luz Cuello',
  emailAddress: 'luz.cuello@flockit.com.ar',
};

const MOCK_ISSUES: JiraIssue[] = [
  // ── Sprint 3 - Dashboard (activo) ─────────────────────────────────────────
  { id:'5',  key:'SCRUM-5',  fields:{ summary:'Setup inicial del proyecto y estructura de carpetas', status:{id:'s4',name:'Finalizado', statusCategory:{key:'done',        name:'Finalizado',  colorName:'green'}},     assignee:{accountId:'a1',displayName:'Luz Cuello'},       priority:{id:'p2',name:'High'},    duedate:'2026-08-14', issuetype:{id:'t1',name:'Tarea'} }},
  { id:'6',  key:'SCRUM-6',  fields:{ summary:'Configurar pipeline CI/CD con GitHub Actions',        status:{id:'s4',name:'Finalizado', statusCategory:{key:'done',        name:'Finalizado',  colorName:'green'}},     assignee:{accountId:'a1',displayName:'Luz Cuello'},       priority:{id:'p2',name:'High'},    duedate:'2026-08-14', issuetype:{id:'t1',name:'Tarea'} }},
  { id:'7',  key:'SCRUM-7',  fields:{ summary:'Pantalla de registro y perfil de usuario',            status:{id:'s4',name:'Finalizado', statusCategory:{key:'done',        name:'Finalizado',  colorName:'green'}},     assignee:{accountId:'a2',displayName:'Carlos López'},     priority:{id:'p3',name:'Medium'},  duedate:'2026-08-30', issuetype:{id:'t1',name:'Tarea'} }},
  { id:'8',  key:'SCRUM-8',  fields:{ summary:'Diseñar dashboard principal con KPI cards',           status:{id:'s2',name:'En curso',   statusCategory:{key:'indeterminate',name:'En curso',    colorName:'yellow'}},    assignee:{accountId:'a1',displayName:'Luz Cuello'},       priority:{id:'p2',name:'High'},    duedate:'2026-10-08', issuetype:{id:'t3',name:'Feature'} }},
  { id:'9',  key:'SCRUM-9',  fields:{ summary:'Integrar gráficos de barras y líneas con Chart.js',  status:{id:'s2',name:'En curso',   statusCategory:{key:'indeterminate',name:'En curso',    colorName:'yellow'}},    assignee:{accountId:'a2',displayName:'Carlos López'},     priority:{id:'p3',name:'Medium'},  duedate:'2026-10-09', issuetype:{id:'t1',name:'Tarea'} }},
  { id:'10', key:'SCRUM-10', fields:{ summary:'API de exportación de reportes en PDF',               status:{id:'s1',name:'Por hacer',  statusCategory:{key:'new',         name:'Por hacer',   colorName:'blue-gray'}}, assignee:undefined,                                       priority:{id:'p3',name:'Medium'},  duedate:'2026-10-10', issuetype:{id:'t1',name:'Tarea'} }},
  { id:'11', key:'SCRUM-11', fields:{ summary:'Crash en filtro de rango de fechas en reportes',      status:{id:'s2',name:'En curso',   statusCategory:{key:'indeterminate',name:'En curso',    colorName:'yellow'}},    assignee:{accountId:'a1',displayName:'Luz Cuello'},       priority:{id:'p1',name:'Highest'}, duedate:'2026-10-07', issuetype:{id:'t1',name:'Tarea'} }},
  { id:'12', key:'SCRUM-12', fields:{ summary:'Tests unitarios del servicio JiraService',            status:{id:'s1',name:'Por hacer',  statusCategory:{key:'new',         name:'Por hacer',   colorName:'blue-gray'}}, assignee:undefined,                                            priority:{id:'p4',name:'Low'},     duedate:'2026-10-10', issuetype:{id:'t1',name:'Tarea'} }},
  // ── Issues originales del proyecto ────────────────────────────────────────
  { id:'1',  key:'SCRUM-1',  fields:{ summary:'Definir arquitectura base y patrones de diseño',      status:{id:'s4',name:'Finalizado', statusCategory:{key:'done',        name:'Finalizado',  colorName:'green'}},     assignee:{accountId:'a1',displayName:'Luz Cuello'},       priority:{id:'p1',name:'Highest'}, duedate:'2026-09-05', issuetype:{id:'t3',name:'Feature'} }},
  { id:'2',  key:'SCRUM-2',  fields:{ summary:'Implementar login con JWT y refresh token',           status:{id:'s3',name:'En revisión',statusCategory:{key:'indeterminate',name:'En revisión', colorName:'yellow'}},    assignee:{accountId:'a2',displayName:'Carlos López'},     priority:{id:'p2',name:'High'},    duedate:'2026-10-08', issuetype:{id:'t3',name:'Feature'} }},
  { id:'3',  key:'SCRUM-3',  fields:{ summary:'Integración completa con Jira REST API v3',          status:{id:'s2',name:'En curso',   statusCategory:{key:'indeterminate',name:'En curso',    colorName:'yellow'}},    assignee:{accountId:'a1',displayName:'Luz Cuello'},       priority:{id:'p2',name:'High'},    duedate:'2026-10-09', issuetype:{id:'t3',name:'Feature'} }},
  { id:'4',  key:'SCRUM-4',  fields:{ summary:'Diseño de tema oscuro con Angular Material',          status:{id:'s1',name:'Por hacer',  statusCategory:{key:'new',         name:'Por hacer',   colorName:'blue-gray'}}, assignee:undefined,                                            priority:{id:'p3',name:'Medium'},  duedate:'2026-10-10', issuetype:{id:'t1',name:'Tarea'} }},
  // ── Sprint 4 - Integraciones (futuro) ─────────────────────────────────────
  { id:'13', key:'SCRUM-13', fields:{ summary:'Webhooks para notificaciones en tiempo real',         status:{id:'s1',name:'Por hacer',  statusCategory:{key:'new',         name:'Por hacer',   colorName:'blue-gray'}}, assignee:undefined,                                            priority:{id:'p3',name:'Medium'},  duedate:'2026-10-25', issuetype:{id:'t3',name:'Feature'} }},
  { id:'14', key:'SCRUM-14', fields:{ summary:'Integración con Slack para alertas de sprint',        status:{id:'s1',name:'Por hacer',  statusCategory:{key:'new',         name:'Por hacer',   colorName:'blue-gray'}}, assignee:undefined,                                            priority:{id:'p4',name:'Low'},     duedate:'2026-10-26', issuetype:{id:'t1',name:'Tarea'} }},
  // ── Sprint 5 - Optimización (futuro) ──────────────────────────────────────
  { id:'15', key:'SCRUM-15', fields:{ summary:'Optimizar bundle size con lazy loading avanzado',     status:{id:'s1',name:'Por hacer',  statusCategory:{key:'new',         name:'Por hacer',   colorName:'blue-gray'}}, assignee:undefined,                                            priority:{id:'p3',name:'Medium'},  duedate:'2026-11-05', issuetype:{id:'t1',name:'Tarea'} }},
  { id:'16', key:'SCRUM-16', fields:{ summary:'Refactor de servicios core a arquitectura hexagonal', status:{id:'s1',name:'Por hacer',  statusCategory:{key:'new',         name:'Por hacer',   colorName:'blue-gray'}}, assignee:undefined,                                            priority:{id:'p4',name:'Low'},     duedate:'2026-11-08', issuetype:{id:'t1',name:'Tarea'} }},
];

const MOCK_PROJECT: JiraProject = {
  id: '10000', key: 'SCRUM', name: 'Flock AI Day — Dashboard',
  projectTypeKey: 'software', lead: MOCK_USER,
  insight: { totalIssueCount: 16, lastIssueUpdateTime: new Date().toISOString() },
};

const MOCK_SPRINT: JiraSprint = {
  id: 5, name: 'Sprint 3 - Dashboard', state: 'active',
  startDate: '2026-09-01T09:00:00.000Z',
  endDate:   '2026-10-10T18:00:00.000Z',
  goal: 'Implementar dashboard principal y sistema de reportes',
};

export const MOCK_PENDING: PendingItem[] = [
  { icon:'assignment_late', title:'Aprobación del cliente — UI de facturación',  meta:'Sin respuesta desde 05 oct · Responsable: Sofía Chen', urgency:'high' },
  { icon:'vpn_key',         title:'Acceso API Salesforce (producción)',           meta:'Pendiente de Salesforce · ETA desconocido',            urgency:'high' },
  { icon:'gavel',           title:'Revisión legal — Política de privacidad v2',  meta:'Área Legal · Enviado 01 oct, sin respuesta',           urgency:'medium' },
  { icon:'credit_card',     title:'Habilitación cuenta Stripe producción',       meta:'KYB en proceso · ETA 15 oct',                         urgency:'medium' },
  { icon:'verified_user',   title:'Firma NDA con proveedor de ciberseguridad',   meta:'Legal + Procurement · Iniciado 07 oct',                urgency:'low' },
];

export const MOCK_UPDATES: ActivityUpdate[] = [
  { icon:'rocket_launch', iconColor:'#4f6ef7', title:'Sprint 7 kick-off completado',                meta:'Backlog priorizado. 10 tareas nuevas incorporadas.',              time:'Hoy, 09:00' },
  { icon:'block',         iconColor:'#ef4444', title:'Seguridad bloqueada por acceso Stripe',       meta:'Carlos escaló el issue a Procurement. ETA: 15 oct.',             time:'Hoy, 08:30' },
  { icon:'cloud_upload',  iconColor:'#22c55e', title:'Deploy en staging al 70%',                    meta:'Juan M. completó config ECS. Faltan vars de entorno.',           time:'Ayer, 17:45' },
  { icon:'merge',         iconColor:'#22c55e', title:'CI/CD pipeline aprobado en PR #48',           meta:'GitHub Actions verde. Diego Torres merged a main.',              time:'Ayer, 14:20' },
  { icon:'check_circle',  iconColor:'#22c55e', title:'2FA implementado y testeado',                 meta:'Sofía Chen cerró la tarea. 100% cobertura en módulo auth.',      time:'08 oct, 11:00' },
];

export const MILESTONES: Milestone[] = [
  { label:'Diseño UX',    date:'15 ago', state:'done' },
  { label:'Dev Backend',  date:'15 sep', state:'done' },
  { label:'Integración',  date:'31 oct', state:'current' },
  { label:'QA & Testing', date:'15 nov', state:'pending' },
  { label:'Go-live',      date:'30 nov', state:'pending' },
];

// ─── Service ──────────────────────────────────────────────────────────────────

export type AuthMode = 'mock' | 'basic' | 'oauth';

@Injectable({ providedIn: 'root' })
export class JiraService {
  private http = inject(HttpClient);
  private config: JiraConfig | null = null;
  private mode: AuthMode = 'mock';

  get projectKey(): string {
    return this.config?.projectKey ?? 'SCRUM';
  }

  get authMode(): AuthMode {
    return this.mode;
  }

  /** Basic Auth con API token (development) */
  configure(config: JiraConfig): void {
    this.config = config;
    this.mode = 'basic';
  }

  /** OAuth 2.0 via BFF proxy — el BFF agrega el Bearer token */
  configureOAuth(projectKey = 'SCRUM'): void {
    this.config = { baseUrl: '', email: '', apiToken: '', projectKey };
    this.mode = 'oauth';
  }

  private get useMock(): boolean { return this.mode === 'mock'; }

  private get headers(): HttpHeaders {
    if (!this.config || this.mode !== 'basic') return new HttpHeaders();
    const token = btoa(`${this.config.email}:${this.config.apiToken}`);
    return new HttpHeaders({
      Authorization: `Basic ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    });
  }

  private get apiBase(): string {
    // Tanto oauth como basic pasan por /api/jira/... (BFF local u OAuth serverless en Vercel)
    return '/api/jira/rest/api/3';
  }

  private requestOptions() {
    // OAuth: la sesión viaja via cookie HttpOnly
    // Basic: el proxy serverless agrega las credenciales desde env vars
    return this.mode === 'oauth' ? { withCredentials: true } : {};
  }

  getCurrentUser(): Observable<JiraUser> {
    if (this.useMock) return of(MOCK_USER);
    return this.http.get<JiraUser>(`${this.apiBase}/myself`, this.requestOptions());
  }

  searchIssues(
    jql: string,
    fields: string[] = ['summary', 'status', 'assignee', 'priority', 'duedate', 'issuetype'],
    maxResults = 50,
    startAt = 0,
  ): Observable<SearchResult> {
    if (this.useMock) {
      const issues = this.applyMockJql(jql);
      return of({ startAt, maxResults, total: issues.length, issues: issues.slice(startAt, startAt + maxResults) });
    }
    const mockFallback = this.applyMockJql(jql);
    const fallback: SearchResult = { startAt, maxResults, total: mockFallback.length, issues: mockFallback };
    return this.http.post<SearchResult>(
      `${this.apiBase}/issue/search`,
      { jql, fields, startAt, maxResults },
      this.requestOptions(),
    ).pipe(catchError(() => of(fallback)));
  }

  getProjects(maxResults = 50): Observable<ProjectSearchResult> {
    if (this.useMock) return of({ startAt: 0, maxResults, total: 1, values: [MOCK_PROJECT] });
    const params = new HttpParams().set('maxResults', String(maxResults));
    return this.http.get<ProjectSearchResult>(
      `${this.apiBase}/project/search`,
      { ...this.requestOptions(), params },
    );
  }

  getActiveSprint(): Observable<JiraSprint> {
    return of(MOCK_SPRINT);
  }

  getPendingItems(): Observable<PendingItem[]> { return of(MOCK_PENDING); }
  getActivityUpdates(): Observable<ActivityUpdate[]> { return of(MOCK_UPDATES); }
  getMilestones(): Observable<Milestone[]> { return of(MILESTONES); }

  private applyMockJql(jql: string): JiraIssue[] {
    const q = jql.toLowerCase();
    if (q.includes('done') || q.includes('completada'))        return MOCK_ISSUES.filter(i => i.fields.status.statusCategory.key === 'done');
    if (q.includes('indeterminate') || q.includes('progreso')) return MOCK_ISSUES.filter(i => i.fields.status.statusCategory.key === 'indeterminate');
    if (q.includes('undefined') || q.includes('bloqueada'))    return MOCK_ISSUES.filter(i => i.fields.status.statusCategory.key === 'undefined');
    if (q.includes('new') || q.includes('por hacer'))          return MOCK_ISSUES.filter(i => i.fields.status.statusCategory.key === 'new');
    return MOCK_ISSUES;
  }
}

