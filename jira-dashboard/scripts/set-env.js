// Genera src/environments/environment.prod.ts con las variables de entorno.
// Se ejecuta como prebuild en Vercel (o cualquier CI/CD).
//
// Acepta dos formatos de nombre de variable:
//   Formato recomendado  →  Alternativa (camelCase)
//   APP_USER             →  auth
//   APP_PASS             →  password
//   JIRA_BASE_URL        →  baseUrl
//   JIRA_EMAIL           →  email
//   JIRA_API_TOKEN       →  apiToken
//   JIRA_PROJECT         →  projectKey
//
const { writeFileSync, mkdirSync } = require('fs');
const { join } = require('path');

const e = process.env;

const user      = e.APP_USER       || e.auth       || 'demo';
const pass      = e.APP_PASS       || e.password   || 'flock2026';
const jiraBase  = e.JIRA_BASE_URL  || e.baseUrl    || '';
const jiraEmail = e.JIRA_EMAIL     || e.email      || '';
const jiraToken = e.JIRA_API_TOKEN || e.apiToken   || '';
const jiraKey   = e.JIRA_PROJECT   || e.projectKey || 'SCRUM';

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
console.log(`✅ environment.prod.ts generado`);
console.log(`   login user  = ${user}`);
console.log(`   jira base   = ${jiraBase || '(no configurado — modo mock)'}`);
console.log(`   jira email  = ${jiraEmail || '(no configurado)'}`);
console.log(`   jira project= ${jiraKey}`);
