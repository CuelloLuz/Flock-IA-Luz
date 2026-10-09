# Plan de Desarrollo — Jira Dashboard Angular

**Fecha:** 09 oct 2026 · **Owner:** Luz Cuello · **Proyecto:** Portal de Clientes v2.0

---

## 1. Visión de Producto

Los equipos pierden tiempo consolidando información de Jira en reportes de estado manuales. Este dashboard centraliza en una sola pantalla el estado real del proyecto — tareas, bloqueos, pendientes y progreso sprint — conectado directamente a la API de Jira Cloud.

**Problema que resuelve:** eliminar el status report manual semanal, reemplazándolo por una vista viva que cualquier stakeholder puede consultar sin abrir Jira.

**Objetivo final:** una SPA Angular lista para producción que:
- Muestra KPIs, progreso por hitos y tabla de issues con datos reales
- Funciona en **modo mock** (sin credenciales) y en **modo real** (Basic Auth → OAuth 2.0)
- Es extensible: nuevas vistas se agregan como rutas lazy sin tocar el core
- Reemplaza definitivamente el PowerPoint o Excel de seguimiento semanal

---

## 2. Stack Tecnológico

| Capa | Tecnología | Justificación |
|------|-----------|---------------|
| Framework | **Angular 19** (standalone) | Estructura, DI, signals, lazy loading nativo |
| UI | **Angular Material 19** | Componentes accesibles, tema consistente, no emojis |
| Estado | **Signals + RxJS** | Signals para estado local, RxJS para streams HTTP |
| HTTP | **HttpClient** (`provideHttpClient`) | Interceptores, typed responses, `withFetch()` |
| Estilos | **SCSS + CSS custom properties** | Variables de tema, encapsulación por componente |
| Routing | **Lazy loading** con `loadComponent` | Chunks separados por vista, mejor performance |
| Testing | **Jest** + **Testing Library** + **Cypress** | Unit rápido, e2e real |
| Linting | **ESLint** + `@angular-eslint` | Reglas Angular específicas |
| Formato | **Prettier** | Consistencia sin debates |
| CI | **GitHub Actions** | Build, test, lint en cada PR |
| API | **Jira REST API v3** | Base URL: `https://{dominio}.atlassian.net/rest/api/3` |
| Auth | **Basic Auth** (desarrollo) → **OAuth 2.0 + BFF** (producción) | Ver etapa 3 |

---

## 3. Arquitectura

```
jira-dashboard/
├── src/app/
│   ├── core/
│   │   ├── models/          # Interfaces Jira (JiraIssue, JiraSprint, etc.)
│   │   ├── services/        # JiraService (mock + real, un flag)
│   │   └── interceptors/    # AuthInterceptor, ErrorInterceptor
│   ├── dashboard/           # Vista principal (lazy) — IMPLEMENTADA
│   ├── tasks/               # Vista completa de tareas (lazy) — etapa 2
│   ├── team/                # Workload del equipo (lazy) — etapa 3
│   ├── reports/             # Exportación y reportes (lazy) — etapa 4
│   └── shared/
│       ├── components/      # Componentes reutilizables (avatar, status-badge)
│       └── pipes/           # Pipes (relative-date, truncate)
├── .github/workflows/       # CI pipelines
├── DESARROLLO.md            # Este archivo
└── .husky/                  # Git hooks
```

**Principios:**
- Un `JiraService` con flag `useMock: boolean` — sin duplicar lógica
- Standalone components, sin NgModules innecesarios
- `inject()` en lugar de constructores con DI
- Signals para estado reactivo simple, RxJS solo para streams async

---

## 4. Etapas de Desarrollo

### Etapa 1 — MVP Dashboard (COMPLETADA ✅)
**Objetivo:** tablero funcional con datos de prueba, listo para demo.

- [x] App shell con `mat-sidenav` + toolbar
- [x] KPI cards con filtros por estado
- [x] Barra de progreso con hitos del proyecto
- [x] Tabla de issues con sort, paginación y filtros
- [x] Panel de pendientes y feed de actividad
- [x] `JiraService` con mock data completa (24 issues)
- [x] Modelos TypeScript alineados con Jira API v3
- [x] Build sin errores, dev server corriendo

### Etapa 2 — Conexión Jira Real (próxima)
**Objetivo:** conectar con la API real manteniendo el modo mock.

- [ ] `AuthInterceptor` que agrega header `Authorization: Basic <token>`
- [ ] `ErrorInterceptor` con manejo de 401, 429 (rate limit) y retry
- [ ] Variables de entorno: `environment.ts` / `environment.prod.ts`
- [ ] Formulario de configuración (dominio, email, API token)
- [ ] Endpoint `GET /rest/api/3/myself` para validar credenciales
- [ ] Paginación real con `startAt` / `total`
- [ ] JQL builder básico (filtrar por proyecto, sprint, assignee)

### Etapa 3 — Autenticación OAuth 2.0
**Objetivo:** auth segura para uso en organización.

- [ ] Backend for Frontend (BFF) mínimo — Node.js/Express o Edge Function
- [ ] Authorization Code flow hacia `https://auth.atlassian.com/authorize`
- [ ] Token refresh automático (tokens expiran)
- [ ] Scopes: `read:jira-work read:jira-user`
- [ ] `cloudId` desde `GET /oauth/token/accessible-resources`
- [ ] Base URL OAuth: `https://api.atlassian.com/ex/jira/{cloudId}/rest/api/3`

### Etapa 4 — Vistas Adicionales
**Objetivo:** ampliar el dashboard con vistas especializadas.

- [ ] Vista `tasks/` — lista completa con filtros avanzados (JQL custom)
- [ ] Vista `team/` — workload por persona, issues asignados
- [ ] Vista `reports/` — exportar a CSV, resumen ejecutivo
- [ ] Notificaciones de issues bloqueados (polling o webhook)

### Etapa 5 — Producción
**Objetivo:** app lista para deployar.

- [ ] Build optimizado (`ng build --configuration=production`)
- [ ] Deploy en Vercel / Netlify / Azure Static Web Apps
- [ ] Cache de respuestas Jira (ETag, 5 min local)
- [ ] PWA básica (service worker, offline con últimos datos)

---

## 5. Buenas Prácticas

### Angular
- **Signals** para estado local del componente; evitar `BehaviorSubject` donde un signal alcanza
- **`OnPush` change detection** en componentes de lista (mejor performance con tablas grandes)
- **`takeUntilDestroyed()`** en subscripciones para evitar memory leaks
- **Lazy loading** de todas las rutas salvo el dashboard inicial
- Tipado estricto: `strict: true` en `tsconfig.json`

### Código
- Un archivo por concepto (no barrel files masivos)
- Interfaces de Jira en `core/models/` — nunca `any`
- Servicios sin lógica de vista; componentes sin lógica de negocio
- Constantes y mock data extraídas del service (exportadas para tests)

### Accesibilidad
- `mat-icon` siempre con `aria-label` o `matTooltip`
- Tablas con `mat-sort-header` anuncian el orden a screen readers
- Contraste mínimo WCAG AA en badges de estado
- Navegación por teclado en el sidenav

---

## 6. Git Hooks (Husky)

```bash
# Instalar
npm install --save-dev husky lint-staged
npx husky init
```

### `pre-commit` — linting y formato
```bash
#!/bin/sh
npx lint-staged
```

### `commit-msg` — convención Conventional Commits
```bash
#!/bin/sh
npx commitlint --edit "$1"
```

### `lint-staged` en `package.json`
```json
{
  "lint-staged": {
    "*.ts": ["eslint --fix", "prettier --write"],
    "*.{html,scss}": ["prettier --write"]
  }
}
```

### Convención de commits
```
feat(dashboard): agregar filtro por assignee en tabla de issues
fix(jira-service): corregir paginación cuando total < maxResults
chore(ci): agregar step de lint en GitHub Actions
docs(readme): documentar pasos de configuración OAuth
test(jira-service): agregar casos de borde para JQL mock
```

**Tipos permitidos:** `feat` | `fix` | `chore` | `docs` | `test` | `refactor` | `perf` | `style`

---

## 7. CI/CD — GitHub Actions

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
          cache-dependency-path: jira-dashboard/package-lock.json

      - name: Install dependencies
        run: npm ci
        working-directory: jira-dashboard

      - name: Lint
        run: npm run lint
        working-directory: jira-dashboard

      - name: Unit tests
        run: npm run test -- --watch=false --browsers=ChromeHeadless
        working-directory: jira-dashboard

      - name: Build
        run: npm run build
        working-directory: jira-dashboard

      - name: Upload build artifact
        uses: actions/upload-artifact@v4
        with:
          name: dist
          path: jira-dashboard/dist/
```

```yaml
# .github/workflows/deploy.yml — solo en merge a main
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    needs: ci
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Vercel
        run: npx vercel --prod --token=${{ secrets.VERCEL_TOKEN }}
```

**Reglas de rama:**
- `main`: protegida, requiere PR + CI verde + 1 review
- `feature/*`: ramas de feature, merge solo vía PR
- `fix/*`: bug fixes
- Nunca pushear directo a `main`

---

## 8. Estrategia de Testing

### Unit Tests — Jest + Angular Testing Library
```bash
npm install --save-dev jest @angular/cdk/testing jest-preset-angular @testing-library/angular
```

**Qué testear:**
- `JiraService`: mock JQL filtering, paginación, `configure()` cambia `useMock`
- `Dashboard` component: renders KPIs correctos, filtros actualizan tabla
- Pipes y helpers: `initials()`, `priorityIcon()`, `statusClass()`

**Ejemplo:**
```typescript
// jira.service.spec.ts
it('should filter blocked issues with JQL containing "bloqueada"', () => {
  service.searchIssues('status = "bloqueada"').subscribe(res => {
    expect(res.issues.every(i => i.fields.status.statusCategory.key === 'undefined')).toBe(true);
  });
});
```

### Integration Tests — TestBed
- Renderizar `Dashboard` con `JiraService` inyectado
- Verificar que click en KPI "Bloqueadas" filtra la tabla
- Verificar que `MatPaginator` funciona correctamente

### E2E — Cypress
```bash
npm install --save-dev cypress @cypress/angular
```

**Casos críticos:**
```typescript
// cypress/e2e/dashboard.cy.ts
it('shows 4 KPI cards with correct counts', () => {
  cy.visit('/dashboard');
  cy.get('.kpi-card').should('have.length', 4);
  cy.contains('.kpi-card', 'Bloqueadas').contains('3');
});

it('filters table when clicking KPI card', () => {
  cy.contains('.kpi-card', 'Completadas').click();
  cy.get('.issues-table tr.issue-row').each($row => {
    cy.wrap($row).contains('Completada');
  });
});
```

**Coverage objetivo:** 80% unit + integration, casos críticos en E2E

---

## 9. Conexión Real a Jira API

### Paso a paso para activar el modo real

**1. Generar API Token**
```
https://id.atlassian.com/manage/api-tokens
→ Create API token → copiar el token
```

**2. Configurar `environment.ts`**
```typescript
// src/environments/environment.ts
export const environment = {
  production: false,
  jira: {
    baseUrl: 'https://TU-DOMINIO.atlassian.net',
    email: 'tu.email@empresa.com',
    apiToken: 'TU_API_TOKEN',   // ⚠️ solo en dev, nunca commitear
  }
};
```

**3. Llamar a `JiraService.configure()` en el bootstrap**
```typescript
// en app.config.ts o en AppComponent.ngOnInit()
import { environment } from '../environments/environment';

const jiraService = inject(JiraService);
jiraService.configure(environment.jira);
```

**4. Agregar `AuthInterceptor`**
```typescript
// src/app/core/interceptors/auth.interceptor.ts
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // El JiraService ya setea el header via this.headers
  // Este interceptor puede agregar lógica global (retry, logging)
  return next(req).pipe(
    catchError(err => {
      if (err.status === 429) {
        // Respetar Retry-After header
        const retryAfter = err.headers.get('Retry-After') ?? '5';
        return timer(Number(retryAfter) * 1000).pipe(switchMap(() => next(req)));
      }
      return throwError(() => err);
    })
  );
};
```

**5. Para OAuth 2.0 (producción)** — requiere BFF:
```
Angular SPA → BFF (Node.js) → auth.atlassian.com (token exchange)
Angular SPA → BFF → api.atlassian.com/ex/jira/{cloudId}/rest/api/3
```
El BFF guarda el `access_token` en una cookie HttpOnly (nunca en localStorage).

**Endpoints usados:**
| Endpoint | Método | Uso |
|----------|--------|-----|
| `/rest/api/3/myself` | GET | Validar credenciales, obtener user info |
| `/rest/api/3/issue/search` | POST | Buscar issues con JQL (preferred sobre GET) |
| `/rest/api/3/project/search` | GET | Listar proyectos disponibles |
| `/rest/agile/1.0/board` | GET | Listar tableros (requiere Jira Software) |
| `/rest/agile/1.0/board/{id}/sprint` | GET | Sprints activos del tablero |

**Nota CORS:** usar `api.atlassian.com` (OAuth) tiene CORS whitelisted. El dominio directo `.atlassian.net` puede requerir proxy en producción.
