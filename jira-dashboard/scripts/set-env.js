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
const { writeFileSync, mkdirSync, existsSync } = require('fs');
const { join } = require('path');

const e = process.env;

const user      = e.APP_USER       || e.auth       || 'demo';
const pass      = e.APP_PASS       || e.password   || 'flock2026';
const jiraBase  = e.JIRA_BASE_URL  || e.baseUrl    || '';
const jiraEmail = e.JIRA_EMAIL     || e.email      || '';
const jiraToken = e.JIRA_API_TOKEN || e.apiToken   || '';
const jiraKey   = e.JIRA_PROJECT   || e.projectKey || 'SCRUM';
// Email y token solo se usan para saber si Jira está configurado: NO se escriben
// en el bundle. El proxy serverless (api/jira) los lee directo del entorno.
const jiraEnabled = Boolean(jiraBase && jiraEmail && jiraToken);

const content = `// Generado automáticamente por scripts/set-env.js — no editar manualmente.
export const environment = {
  production: true,
  auth: {
    user: '${user}',
    password: '${pass}',
  },
  jira: {
    enabled:    ${jiraEnabled},
    projectKey: '${jiraKey}',
  },
};
`;

const dir = join(__dirname, '..', 'src', 'environments');
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, 'environment.prod.ts'), content, 'utf8');
console.log(`✅ environment.prod.ts generado`);

// environment.ts está en .gitignore/.vercelignore (puede tener credenciales locales),
// pero el código lo importa: en CI se crea con el mismo contenido para que compile.
const devEnv = join(dir, 'environment.ts');
if (!existsSync(devEnv)) {
  writeFileSync(devEnv, content, 'utf8');
  console.log(`✅ environment.ts generado (no existía)`);
}
console.log(`   login user  = ${user}`);
console.log(`   jira base   = ${jiraBase || '(no configurado — modo mock)'}`);
console.log(`   jira email  = ${jiraEmail || '(no configurado)'}`);
console.log(`   jira project= ${jiraKey}`);
