// Genera src/environments/environment.prod.ts con las variables de entorno.
// Se ejecuta como prebuild en Vercel (o cualquier CI/CD).
// Variables esperadas: APP_USER, APP_PASS
const { writeFileSync, mkdirSync } = require('fs');
const { join } = require('path');

const user = process.env.APP_USER || 'demo';
const pass = process.env.APP_PASS || 'flock2026';
const jiraBase  = process.env.JIRA_BASE_URL  || '';
const jiraEmail = process.env.JIRA_EMAIL     || '';
const jiraToken = process.env.JIRA_API_TOKEN || '';
const jiraKey   = process.env.JIRA_PROJECT   || 'SCRUM';

const content = `// Generado automáticamente por scripts/set-env.js — no editar manualmente.
export const environment = {
  production: true,
  auth: {
    user: '${user}',
    password: '${pass}',
  },
  jira: {
    baseUrl:    '${jiraBase}',
    email:      '${jiraEmail}',
    apiToken:   '${jiraToken}',
    projectKey: '${jiraKey}',
  },
};
`;

const dir = join(__dirname, '..', 'src', 'environments');
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, 'environment.prod.ts'), content, 'utf8');
console.log(`✅ environment.prod.ts generado (user=${user})`);
