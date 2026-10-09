// Vercel serverless function: proxy de Jira API con Basic Auth.
// En producción reemplaza al BFF para requests de Basic Auth, resolviendo el CORS.
module.exports = async function handler(req, res) {
  // Mismos nombres alternativos (camelCase) que acepta scripts/set-env.js
  const e = process.env;
  const JIRA_BASE_URL  = e.JIRA_BASE_URL  || e.baseUrl;
  const JIRA_EMAIL     = e.JIRA_EMAIL     || e.email;
  const JIRA_API_TOKEN = e.JIRA_API_TOKEN || e.apiToken;

  if (!JIRA_BASE_URL || !JIRA_EMAIL || !JIRA_API_TOKEN) {
    return res.status(503).json({ error: 'Jira not configured' });
  }

  // req.url = /api/jira/rest/api/3/... → /rest/api/3/...
  const jiraPath = req.url.replace(/^\/api\/jira/, '');
  const jiraUrl  = JIRA_BASE_URL.replace(/\/$/, '') + jiraPath;
  const token    = Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64');

  try {
    const response = await fetch(jiraUrl, {
      method:  req.method,
      headers: {
        Authorization:  `Basic ${token}`,
        'Content-Type': 'application/json',
        Accept:         'application/json',
      },
      body: req.method !== 'GET' && req.body ? JSON.stringify(req.body) : undefined,
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
