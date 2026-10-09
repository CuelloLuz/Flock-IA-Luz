require('dotenv').config();
const express  = require('express');
const session  = require('express-session');
const axios    = require('axios');
const cors     = require('cors');
const crypto   = require('crypto');

const app = express();

const {
  CLIENT_ID,
  CLIENT_SECRET,
  SESSION_SECRET,
  REDIRECT_URI    = 'http://localhost:3001/auth/callback',
  FRONTEND_URL    = 'http://localhost:4200',
  PORT            = 3001,
} = process.env;

const ATLASSIAN_AUTH_URL  = 'https://auth.atlassian.com/authorize';
const ATLASSIAN_TOKEN_URL = 'https://auth.atlassian.com/oauth/token';
const ATLASSIAN_RESOURCES = 'https://api.atlassian.com/oauth/token/accessible-resources';
const SCOPES = 'read:jira-work read:jira-user offline_access';

// ── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({ origin: FRONTEND_URL, credentials: true }));
app.use(express.json());
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false,           // true en producción con HTTPS
    sameSite: 'lax',
    maxAge: 8 * 60 * 60 * 1000, // 8 horas
  },
}));

// ── Helper: refresh token ────────────────────────────────────────────────────
async function ensureFreshToken(req) {
  const tokens = req.session.tokens;
  if (!tokens) throw new Error('Not authenticated');

  if (Date.now() < tokens.expires_at - 60_000) return tokens; // aún vigente

  const { data } = await axios.post(ATLASSIAN_TOKEN_URL, {
    grant_type:    'refresh_token',
    client_id:     CLIENT_ID,
    client_secret: CLIENT_SECRET,
    refresh_token: tokens.refresh_token,
  });

  req.session.tokens = {
    ...tokens,
    access_token:  data.access_token,
    refresh_token: data.refresh_token ?? tokens.refresh_token,
    expires_at:    Date.now() + data.expires_in * 1000,
  };

  return req.session.tokens;
}

// ── Auth: login ──────────────────────────────────────────────────────────────
app.get('/auth/login', (req, res) => {
  const state = crypto.randomBytes(16).toString('hex');
  req.session.oauthState = state;

  const url = new URL(ATLASSIAN_AUTH_URL);
  url.searchParams.set('audience',       'api.atlassian.com');
  url.searchParams.set('client_id',      CLIENT_ID);
  url.searchParams.set('scope',          SCOPES);
  url.searchParams.set('redirect_uri',   REDIRECT_URI);
  url.searchParams.set('state',          state);
  url.searchParams.set('response_type',  'code');
  url.searchParams.set('prompt',         'consent');

  res.redirect(url.toString());
});

// ── Auth: callback ───────────────────────────────────────────────────────────
app.get('/auth/callback', async (req, res) => {
  const { code, state, error } = req.query;

  if (error) return res.redirect(`${FRONTEND_URL}/?error=${error}`);

  if (state !== req.session.oauthState) {
    return res.status(403).send('Invalid state — possible CSRF');
  }

  try {
    // Canjear code por tokens
    const { data: tokens } = await axios.post(ATLASSIAN_TOKEN_URL, {
      grant_type:    'authorization_code',
      client_id:     CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code,
      redirect_uri:  REDIRECT_URI,
    });

    // Obtener cloudId y datos del site
    const { data: resources } = await axios.get(ATLASSIAN_RESOURCES, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    const site = resources[0]; // primer site accesible

    req.session.tokens = {
      access_token:  tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at:    Date.now() + tokens.expires_in * 1000,
      cloudId:       site.id,
      siteName:      site.name,
      siteUrl:       site.url,
    };
    delete req.session.oauthState;

    res.redirect(`${FRONTEND_URL}/dashboard`);
  } catch (err) {
    console.error('OAuth callback error:', err.response?.data ?? err.message);
    res.redirect(`${FRONTEND_URL}/?error=oauth_failed`);
  }
});

// ── Auth: me ─────────────────────────────────────────────────────────────────
app.get('/auth/me', async (req, res) => {
  if (!req.session.tokens) return res.status(401).json({ error: 'Not authenticated' });

  try {
    const tokens = await ensureFreshToken(req);
    const { data: user } = await axios.get(
      `https://api.atlassian.com/ex/jira/${tokens.cloudId}/rest/api/3/myself`,
      { headers: { Authorization: `Bearer ${tokens.access_token}` } },
    );
    res.json({
      authenticated: true,
      cloudId:   tokens.cloudId,
      siteName:  tokens.siteName,
      siteUrl:   tokens.siteUrl,
      user: {
        displayName:  user.displayName,
        emailAddress: user.emailAddress,
        avatarUrl:    user.avatarUrls?.['48x48'],
      },
    });
  } catch (err) {
    console.error('me error:', err.message);
    res.status(401).json({ error: 'Session expired' });
  }
});

// ── Auth: logout ─────────────────────────────────────────────────────────────
app.post('/auth/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

// ── Proxy Jira API ───────────────────────────────────────────────────────────
app.all('/api/jira/*', async (req, res) => {
  if (!req.session.tokens) return res.status(401).json({ error: 'Not authenticated' });

  try {
    const tokens = await ensureFreshToken(req);
    const jiraPath = req.path.replace('/api/jira', ''); // /rest/api/3/...
    const jiraUrl  = `https://api.atlassian.com/ex/jira/${tokens.cloudId}${jiraPath}`;

    const response = await axios({
      method:  req.method,
      url:     jiraUrl,
      headers: {
        Authorization:  `Bearer ${tokens.access_token}`,
        'Content-Type': 'application/json',
        Accept:         'application/json',
      },
      data:   req.method !== 'GET' ? req.body : undefined,
      params: req.query,
    });

    res.status(response.status).json(response.data);
  } catch (err) {
    const status = err.response?.status ?? 500;
    const data   = err.response?.data   ?? { error: 'Proxy error', message: err.message };
    console.error(`Jira proxy error [${status}]:`, data);
    res.status(status).json(data);
  }
});

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (_, res) => res.json({ ok: true, service: 'jira-bff' }));

app.listen(PORT, () => {
  console.log(`\n🔐 Jira BFF corriendo en http://localhost:${PORT}`);
  console.log(`   Login:    http://localhost:${PORT}/auth/login`);
  console.log(`   Callback: ${REDIRECT_URI}`);
  console.log(`   Frontend: ${FRONTEND_URL}\n`);
});
