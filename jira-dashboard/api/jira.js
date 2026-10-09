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

  // vercel.json reescribe /api/jira/<path> → /api/jira?path=<path> (se conserva el resto del query)
  const url = new URL(req.url, 'http://localhost');
  const pathParam = url.searchParams.get('path');
  url.searchParams.delete('path');
  const jiraPath = pathParam != null
    ? '/' + pathParam.replace(/^\/+/, '')
    : url.pathname.replace(/^\/api\/jira/, '');
  const query    = url.searchParams.toString();
  const jiraUrl  = JIRA_BASE_URL.replace(/\/$/, '') + jiraPath + (query ? `?${query}` : '');
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
