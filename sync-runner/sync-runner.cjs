const express = require('express');

const app = express();
const port = Number(process.env.PORT || 10000);
const intervalMs = Number(process.env.SYNC_INTERVAL_MS || 300000);

app.use(express.json());

const syncState = {
  inFlight: false,
  lastStartedAt: null,
  lastFinishedAt: null,
  lastSource: null,
  lastSuccess: null,
  lastStatusCode: null,
  lastStatusText: null,
  lastError: null,
  lastResponsePreview: null,
};

function normalizedSyncUrl() {
  const base = (process.env.HUB_SYNC_URL || '').trim().replace(/\/$/, '');
  if (!base) return '';
  if (base.endsWith('/api/sync-hub/sync')) return base;
  return `${base}/api/sync-hub/sync`;
}

function stateSnapshot() {
  return {
    name: 'ATIW Sync Runner',
    status: 'running',
    intervalMs,
    target: normalizedSyncUrl(),
    ...syncState,
  };
}

async function triggerSync(source = 'interval') {
  const url = normalizedSyncUrl();
  const startedAt = new Date().toISOString();

  syncState.inFlight = true;
  syncState.lastStartedAt = startedAt;
  syncState.lastSource = source;
  syncState.lastError = null;

  if (!url) {
    syncState.inFlight = false;
    syncState.lastFinishedAt = new Date().toISOString();
    syncState.lastSuccess = false;
    syncState.lastStatusCode = null;
    syncState.lastStatusText = 'HUB_SYNC_URL missing';
    syncState.lastError = 'HUB_SYNC_URL ist nicht gesetzt. Sync wird uebersprungen.';
    console.warn(syncState.lastError);
    return { ok: false, skipped: true, reason: syncState.lastError, state: stateSnapshot() };
  }

  try {
    const response = await fetch(url, { method: 'POST' });
    const body = await response.text();
    const bodyPreview = (body || '').slice(0, 1000);

    syncState.inFlight = false;
    syncState.lastFinishedAt = new Date().toISOString();
    syncState.lastSuccess = response.ok;
    syncState.lastStatusCode = response.status;
    syncState.lastStatusText = response.statusText;
    syncState.lastResponsePreview = bodyPreview;

    console.log(`[${new Date().toISOString()}] Sync POST ${url} -> ${response.status} ${response.statusText}`);
    if (bodyPreview) {
      console.log(bodyPreview);
    }

    return {
      ok: response.ok,
      skipped: false,
      statusCode: response.status,
      statusText: response.statusText,
      bodyPreview,
      state: stateSnapshot(),
    };
  } catch (error) {
    syncState.inFlight = false;
    syncState.lastFinishedAt = new Date().toISOString();
    syncState.lastSuccess = false;
    syncState.lastStatusCode = null;
    syncState.lastStatusText = 'request failed';
    syncState.lastError = error.message;
    syncState.lastResponsePreview = null;

    console.error(`[${new Date().toISOString()}] Sync fehlgeschlagen:`, error.message);

    return {
      ok: false,
      skipped: false,
      error: error.message,
      state: stateSnapshot(),
    };
  }
}

function renderRunnerUi() {
  return `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>ATIW Sync Runner</title>
  <style>
    :root {
      --bg-1: #f6f7f2;
      --bg-2: #e7ecf8;
      --card: #ffffff;
      --ink: #1d2735;
      --muted: #5d6778;
      --ok: #1f8a5b;
      --warn: #9c5e0b;
      --err: #a02020;
      --accent: #1659a8;
      --accent-2: #0f467f;
      --border: #d7dce5;
      --mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      --sans: "Segoe UI", "Noto Sans", Arial, sans-serif;
    }

    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: var(--sans);
      color: var(--ink);
      background: radial-gradient(circle at 5% 10%, var(--bg-2), transparent 35%), var(--bg-1);
      min-height: 100vh;
    }
    .wrap {
      max-width: 980px;
      margin: 0 auto;
      padding: 28px 16px 40px;
    }
    .hero {
      border: 1px solid var(--border);
      border-radius: 16px;
      background: linear-gradient(140deg, #f8fbff, #ffffff 40%);
      padding: 20px;
      box-shadow: 0 8px 26px rgba(17, 47, 86, 0.08);
      margin-bottom: 16px;
    }
    h1 { margin: 0 0 8px; font-size: 1.6rem; }
    .lead { color: var(--muted); margin: 0; }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
      gap: 12px;
      margin: 14px 0;
    }
    .card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 12px;
    }
    .k { color: var(--muted); font-size: 0.84rem; margin-bottom: 4px; }
    .v { font-size: 1.06rem; font-weight: 700; }
    .mono { font-family: var(--mono); word-break: break-word; }
    .row { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-top: 12px; }
    button {
      border: 0;
      border-radius: 10px;
      background: var(--accent);
      color: #fff;
      padding: 10px 14px;
      font-weight: 700;
      cursor: pointer;
      transition: transform 100ms ease, background 100ms ease;
    }
    button:hover { background: var(--accent-2); transform: translateY(-1px); }
    button:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
    .pill {
      display: inline-flex;
      align-items: center;
      border-radius: 999px;
      font-size: 0.79rem;
      padding: 5px 10px;
      font-weight: 700;
    }
    .ok { background: #e8f7ef; color: var(--ok); }
    .warn { background: #fff4e3; color: var(--warn); }
    .err { background: #ffe8e8; color: var(--err); }
    pre {
      margin: 10px 0 0;
      border: 1px solid var(--border);
      background: #f8fafc;
      padding: 10px;
      border-radius: 10px;
      font-family: var(--mono);
      font-size: 0.78rem;
      max-height: 260px;
      overflow: auto;
      white-space: pre-wrap;
    }
  </style>
</head>
<body>
  <main class="wrap">
    <section class="hero">
      <h1>ATIW Sync Runner</h1>
      <p class="lead">Taktet den Sync-Call zum Sync-Hub und zeigt den letzten Laufstatus an.</p>
      <div class="row">
        <button id="triggerBtn">Sync jetzt ausloesen</button>
        <span id="statusPill" class="pill warn">Lade Status ...</span>
      </div>
      <div class="grid" id="cards"></div>
      <pre id="preview">Noch kein Lauf.</pre>
    </section>
  </main>
  <script>
    const cards = document.getElementById('cards');
    const preview = document.getElementById('preview');
    const pill = document.getElementById('statusPill');
    const button = document.getElementById('triggerBtn');

    function formatValue(value) {
      if (value === null || value === undefined || value === '') return 'n/a';
      return String(value);
    }

    function cardHtml(label, value, isMono) {
      return '<div class="card"><div class="k">' + label + '</div><div class="v ' + (isMono ? 'mono' : '') + '">' + formatValue(value) + '</div></div>';
    }

    function render(state) {
      cards.innerHTML = [
        cardHtml('Intervall (ms)', state.intervalMs),
        cardHtml('Ziel-URL', state.target || 'nicht gesetzt', true),
        cardHtml('Letzte Quelle', state.lastSource),
        cardHtml('Letzter Start', state.lastStartedAt),
        cardHtml('Letztes Ende', state.lastFinishedAt),
        cardHtml('HTTP-Status', state.lastStatusCode ? state.lastStatusCode + ' ' + (state.lastStatusText || '') : state.lastStatusText || 'n/a')
      ].join('');

      if (state.inFlight) {
        pill.className = 'pill warn';
        pill.textContent = 'Sync laeuft';
      } else if (state.lastSuccess === true) {
        pill.className = 'pill ok';
        pill.textContent = 'Letzter Sync erfolgreich';
      } else if (state.lastSuccess === false) {
        pill.className = 'pill err';
        pill.textContent = 'Letzter Sync fehlgeschlagen';
      } else {
        pill.className = 'pill warn';
        pill.textContent = 'Noch kein Lauf';
      }

      preview.textContent = state.lastResponsePreview || state.lastError || 'Noch keine Rueckmeldung vom Sync-Hub.';
    }

    async function loadStatus() {
      const response = await fetch('/api/status');
      const state = await response.json();
      render(state);
    }

    async function runSyncNow() {
      button.disabled = true;
      try {
        const response = await fetch('/api/trigger-sync', { method: 'POST' });
        const payload = await response.json();
        render(payload.state || payload);
      } finally {
        button.disabled = false;
      }
    }

    button.addEventListener('click', runSyncNow);
    loadStatus().catch((error) => {
      pill.className = 'pill err';
      pill.textContent = 'Fehler beim Laden';
      preview.textContent = error.message;
    });
    setInterval(() => loadStatus().catch(() => {}), 10000);
  </script>
</body>
</html>`;
}

app.get('/', (req, res) => {
  if (req.accepts(['html', 'json']) === 'json') {
    return res.json(stateSnapshot());
  }

  return res.type('html').send(renderRunnerUi());
});

app.get('/api/status', (_req, res) => {
  res.json(stateSnapshot());
});

app.post('/api/trigger-sync', async (_req, res) => {
  const result = await triggerSync('manual');
  res.status(result.ok ? 200 : 502).json(result);
});

app.get('/healthz', (_req, res) => {
  res.json({ ok: true, inFlight: syncState.inFlight });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`ATIW Sync Runner listening on ${port}`);
  console.log(`Sync interval: ${intervalMs} ms`);
  triggerSync('startup');
  setInterval(() => {
    triggerSync('interval');
  }, intervalMs);
});