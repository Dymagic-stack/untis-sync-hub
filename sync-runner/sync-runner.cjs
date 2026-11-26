const express = require('express');

const app = express();
const port = Number(process.env.PORT || 10000);
const intervalMs = Number(process.env.SYNC_INTERVAL_MS || 300000);

function normalizedSyncUrl() {
  const base = (process.env.HUB_SYNC_URL || '').trim().replace(/\/$/, '');
  if (!base) return '';
  if (base.endsWith('/api/sync-hub/sync')) return base;
  return `${base}/api/sync-hub/sync`;
}

async function triggerSync() {
  const url = normalizedSyncUrl();
  if (!url) {
    console.warn('HUB_SYNC_URL ist nicht gesetzt. Sync wird uebersprungen.');
    return;
  }

  try {
    const response = await fetch(url, { method: 'POST' });
    const body = await response.text();
    console.log(`[${new Date().toISOString()}] Sync POST ${url} -> ${response.status} ${response.statusText}`);
    if (body) {
      console.log(body.slice(0, 500));
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Sync fehlgeschlagen:`, error.message);
  }
}

app.get('/', (_req, res) => {
  res.json({
    name: 'ATIW Sync Runner',
    status: 'running',
    intervalMs,
    target: normalizedSyncUrl(),
  });
});

app.get('/healthz', (_req, res) => {
  res.json({ ok: true });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`ATIW Sync Runner listening on ${port}`);
  console.log(`Sync interval: ${intervalMs} ms`);
  triggerSync();
  setInterval(triggerSync, intervalMs);
});