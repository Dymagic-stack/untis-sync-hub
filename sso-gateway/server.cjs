const crypto = require('crypto');
const express = require('express');
const cookieParser = require('cookie-parser');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const port = Number(process.env.PORT || 10010);

const ssoMode = String(process.env.SSO_MODE || 'mock').toLowerCase();
const sessionCookieName = process.env.SSO_COOKIE_NAME || 'atiw_sso_session';
const appContextCookieName = process.env.SSO_APP_CONTEXT_COOKIE || 'atiw_app_ctx';
const sessionTtlSec = Number(process.env.SSO_SESSION_TTL_SEC || 43200);
const sessionSecret = String(process.env.SSO_SESSION_SECRET || 'atiw-dev-session-secret-change-me');

const targets = {
  syncHub: String(process.env.SYNC_HUB_URL || 'http://localhost:8080').replace(/\/$/, ''),
  webuntis: String(process.env.WEBUNTIS_URL || 'http://localhost:8081').replace(/\/$/, ''),
  moodle: String(process.env.MOODLE_URL || 'http://localhost:8082').replace(/\/$/, ''),
};

const teacherGroupIds = String(process.env.ENTRA_TEACHER_GROUP_IDS || '')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);

app.use(cookieParser());
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

function base64UrlEncode(value) {
  return Buffer.from(value).toString('base64url');
}

function base64UrlDecode(value) {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function hmac(input) {
  return crypto.createHmac('sha256', sessionSecret).update(input).digest('base64url');
}

function createSessionToken(payload) {
  const body = base64UrlEncode(JSON.stringify(payload));
  const signature = hmac(body);
  return `${body}.${signature}`;
}

function readSessionToken(token) {
  if (!token || !token.includes('.')) {
    return null;
  }

  const [body, signature] = token.split('.');
  if (!body || !signature) {
    return null;
  }

  const expected = hmac(body);
  if (signature.length !== expected.length) {
    return null;
  }
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return null;
  }

  try {
    const parsed = JSON.parse(base64UrlDecode(body));
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }
    if (!parsed.exp || parsed.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function buildSession({ username, role, syncAccess, source }) {
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = issuedAt + sessionTtlSec;
  const canAccessSync = role === 'teacher' && syncAccess;

  return {
    sub: username,
    role,
    canAccessSync,
    source,
    iat: issuedAt,
    exp: expiresAt,
  };
}

function parseCsvHeader(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function resolveEntraSession(req) {
  const principalName = req.get('x-ms-client-principal-name') || req.get('x-forwarded-preferred-username') || req.get('x-forwarded-email');
  if (!principalName) {
    return null;
  }

  const roleHeaderValues = parseCsvHeader(req.get('x-entra-roles') || req.get('x-user-role') || req.get('x-forwarded-roles'));
  const groupHeaderValues = parseCsvHeader(req.get('x-entra-groups') || req.get('x-ms-client-principal-groups'));

  const isTeacherByRole = roleHeaderValues.some((item) => item.toLowerCase() === 'teacher');
  const isTeacherByGroup = teacherGroupIds.length > 0 && groupHeaderValues.some((item) => teacherGroupIds.includes(item));
  const role = isTeacherByRole || isTeacherByGroup ? 'teacher' : 'student';

  return buildSession({
    username: principalName,
    role,
    syncAccess: role === 'teacher',
    source: 'entra-header',
  });
}

function attachSession(req, _res, next) {
  if (ssoMode === 'entra-header') {
    const headerSession = resolveEntraSession(req);
    if (headerSession) {
      req.userSession = headerSession;
      return next();
    }
  }

  const token = req.cookies[sessionCookieName];
  req.userSession = readSessionToken(token);
  next();
}

function requireAuth(req, res, next) {
  if (req.userSession) {
    return next();
  }

  const nextPath = encodeURIComponent(req.originalUrl || '/');
  return res.redirect(`/login?next=${nextPath}`);
}

function requireSyncHubAccess(req, res, next) {
  if (!req.userSession) {
    const nextPath = encodeURIComponent(req.originalUrl || '/');
    return res.redirect(`/login?next=${nextPath}`);
  }

  if (!req.userSession.canAccessSync) {
    return res.status(403).type('html').send('<h1>403</h1><p>Kein Zugriff auf den Sync-Hub.</p><p><a href="/">Zurueck</a></p>');
  }

  return next();
}

function addSsoQuery(path, req) {
  const target = new URL(path, 'http://placeholder.local');
  target.searchParams.set('sso_role', req.userSession?.role || 'student');
  target.searchParams.set('sso_lock', '1');
  target.searchParams.set('sso_sync_access', req.userSession?.canAccessSync ? '1' : '0');
  return `${target.pathname}${target.search}`;
}

function proxyTo(target, options = {}) {
  const { injectSsoQuery = false, stripPrefixRegex } = options;

  return createProxyMiddleware({
    target,
    changeOrigin: true,
    ws: true,
    pathRewrite: (path, req) => {
      const stripped = stripPrefixRegex ? path.replace(stripPrefixRegex, '') : path;
      return injectSsoQuery ? addSsoQuery(stripped || '/', req) : stripped || '/';
    },
    onError: (_err, _req, res) => {
      res.status(502).json({ error: 'Upstream nicht erreichbar.' });
    },
  });
}

const syncHubProxy = proxyTo(targets.syncHub, { stripPrefixRegex: /^\/sync-hub/ });
const webuntisProxy = proxyTo(targets.webuntis, { injectSsoQuery: true, stripPrefixRegex: /^\/webuntis/ });
const moodleProxy = proxyTo(targets.moodle, { injectSsoQuery: true, stripPrefixRegex: /^\/moodle/ });

const syncHubAssetProxy = createProxyMiddleware({ target: targets.syncHub, changeOrigin: true, ws: true });
const webuntisAssetProxy = createProxyMiddleware({ target: targets.webuntis, changeOrigin: true, ws: true });
const moodleAssetProxy = createProxyMiddleware({ target: targets.moodle, changeOrigin: true, ws: true });

function upstreamFromReferer(req) {
  const referer = req.get('referer');
  if (!referer) {
    return null;
  }

  try {
    const url = new URL(referer);
    const path = url.pathname || '/';
    if (path.startsWith('/sync-hub/')) return 'sync-hub';
    if (path.startsWith('/webuntis/')) return 'webuntis';
    if (path.startsWith('/moodle/')) return 'moodle';
    return null;
  } catch {
    return null;
  }
}

function upstreamFromContextCookie(req) {
  const context = req.cookies[appContextCookieName];
  if (context === 'sync-hub' || context === 'webuntis' || context === 'moodle') {
    return context;
  }
  return null;
}

function withAppContext(context, handler) {
  return (req, res, next) => {
    res.cookie(appContextCookieName, context, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: sessionTtlSec * 1000,
    });
    return handler(req, res, next);
  };
}

function proxySharedAssetByReferer(req, res, next) {
  const upstream = upstreamFromReferer(req) || upstreamFromContextCookie(req);
  if (upstream === 'sync-hub') {
    return syncHubAssetProxy(req, res, next);
  }
  if (upstream === 'webuntis') {
    return webuntisAssetProxy(req, res, next);
  }
  if (upstream === 'moodle') {
    return moodleAssetProxy(req, res, next);
  }

  return res.status(404).send('Asset-Kontext nicht aufloesbar.');
}

app.use(attachSession);

app.get('/healthz', (_req, res) => {
  res.json({ ok: true, mode: ssoMode });
});

app.get('/api/session', (req, res) => {
  if (!req.userSession) {
    return res.status(401).json({ authenticated: false });
  }

  return res.json({
    authenticated: true,
    user: req.userSession.sub,
    role: req.userSession.role,
    canAccessSync: req.userSession.canAccessSync,
    source: req.userSession.source,
  });
});

app.get('/login', (req, res) => {
  const nextPath = String(req.query.next || '/');

  if (ssoMode === 'entra-header') {
    return res.type('html').send(`<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ATIW SSO</title></head>
<body style="font-family:Segoe UI,Arial,sans-serif;padding:24px;background:#f4f6fa;color:#1f2937;">
  <h1>ATIW SSO Gateway</h1>
  <p>Der Gateway laeuft im Entra-Header-Modus. Bitte ueber den vorgeschalteten EntraID-Einstieg aufrufen.</p>
  <p><a href="/" style="color:#0f5ca8">Startseite</a></p>
</body></html>`);
  }

  return res.type('html').send(`<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ATIW SSO Login</title></head>
<body style="font-family:Segoe UI,Arial,sans-serif;padding:24px;background:#f4f6fa;color:#1f2937;">
  <main style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #d6deea;border-radius:14px;padding:24px;">
    <h1 style="margin-top:0;">ATIW SSO Login</h1>
    <p style="color:#4b5563;">Mock-Login fuer lokale Entwicklung. Produktion: SSO_MODE=entra-header.</p>
    <form method="post" action="/login" style="display:grid;gap:12px;">
      <input type="hidden" name="next" value="${nextPath.replace(/"/g, '&quot;')}" />
      <label>Benutzername
        <input name="username" required placeholder="vorname.nachname@atiw.local" style="width:100%;padding:10px;border:1px solid #cdd7e3;border-radius:8px;" />
      </label>
      <label>Rolle
        <select name="role" style="width:100%;padding:10px;border:1px solid #cdd7e3;border-radius:8px;">
          <option value="teacher">Lehrkraft</option>
          <option value="student">Schueler/in</option>
        </select>
      </label>
      <button style="padding:10px 14px;border:0;border-radius:9px;background:#145da0;color:#fff;font-weight:700;">Anmelden</button>
    </form>
  </main>
</body></html>`);
});

app.post('/login', (req, res) => {
  if (ssoMode !== 'mock') {
    return res.status(403).json({ error: 'Mock-Login ist in diesem Modus deaktiviert.' });
  }

  const username = String(req.body.username || '').trim();
  const role = req.body.role === 'teacher' ? 'teacher' : 'student';
  const nextPath = String(req.body.next || '/');

  if (!username) {
    return res.status(400).send('Benutzername fehlt.');
  }

  const session = buildSession({
    username,
    role,
    syncAccess: role === 'teacher',
    source: 'mock-login',
  });

  const token = createSessionToken(session);
  res.cookie(sessionCookieName, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: sessionTtlSec * 1000,
    path: '/',
  });

  return res.redirect(nextPath);
});

app.get('/logout', (_req, res) => {
  res.clearCookie(sessionCookieName, { path: '/' });
  res.clearCookie(appContextCookieName, { path: '/' });
  res.redirect('/login');
});

app.use('/build', requireAuth, proxySharedAssetByReferer);
app.get('/sync-logo.png', requireAuth, proxySharedAssetByReferer);
app.get('/favicon.ico', requireAuth, proxySharedAssetByReferer);
app.get('/robots.txt', requireAuth, proxySharedAssetByReferer);

app.get('/', requireAuth, (req, res) => {
  const session = req.userSession;
  const syncLink = session.canAccessSync ? '<li><a href="/sync-hub/">Sync-Hub</a></li>' : '<li style="color:#9ca3af;">Sync-Hub (gesperrt)</li>';

  res.type('html').send(`<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ATIW Portal</title></head>
<body style="font-family:Segoe UI,Arial,sans-serif;padding:24px;background:#eef2f8;color:#1f2937;">
  <main style="max-width:760px;margin:0 auto;background:#fff;border:1px solid #d6deea;border-radius:14px;padding:24px;">
    <h1 style="margin-top:0;">ATIW Portal</h1>
    <p>Angemeldet als <b>${session.sub}</b> (${session.role}).</p>
    <ul style="line-height:1.9;">
      ${syncLink}
      <li><a href="/webuntis/">WebUntis Mock</a></li>
      <li><a href="/moodle/">Moodle Mock</a></li>
    </ul>
    <p><a href="/logout">Abmelden</a></p>
  </main>
</body></html>`);
});

app.use('/sync-hub', requireSyncHubAccess, withAppContext('sync-hub', syncHubProxy));
app.use('/webuntis', requireAuth, withAppContext('webuntis', webuntisProxy));
app.use('/moodle', requireAuth, withAppContext('moodle', moodleProxy));

app.listen(port, '0.0.0.0', () => {
  console.log(`ATIW SSO Gateway listening on ${port}`);
  console.log(`Mode: ${ssoMode}`);
  console.log('Targets:', targets);
});
