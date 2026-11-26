# atiw-sync-hub

Laravel-/Vue-Anwendung zur Validierung, Dokumentation und Delta-Erkennung von Fehlzeiten. Die produktive WebUntis-Schnittstelle wird ausschließlich lesend abgebildet; für Entwicklung und Tests steht eine OpenUntis-Mock-API mit synthetischen Daten zur Verfügung.

## Architektur

- PHP 8.3 / Laravel 12 Backend
- Vue 3 / Vite Frontend
- SQLite-Datenbank
- OpenUntis-Mock für synthetische Stammdaten und Fehlzeiten
- Docker Compose für reproduzierbare lokale Ausführung

## Lokales Deployment mit Docker

```powershell
# Optional: festen Schlüssel zwischen Restarts verwenden
$env:APP_KEY = "base64:..."

# APP_URL bei anderer Domain ersetzen
docker compose up --build -d
```

Der Container erstellt die SQLite-Datenbank bei jedem Start automatisch und führt Migrationen aus. Datenbank und Laravel-Storage werden über benannte Docker-Volumes persistent gehalten.

Nach dem Start:

- Anwendung: <http://localhost:8080>
- Mock-API: <http://localhost:8000>

Stoppen:

```powershell
docker compose down
```

Die Daten bleiben bei `docker compose down` erhalten. Für eine vollständige Bereinigung:

```powershell
docker compose down -v
```

## Lokale Entwicklung ohne Docker

Voraussetzungen: PHP 8.2+, Composer und Node.js 20+.

```powershell
composer install
Copy-Item .env.example .env
php artisan key:generate
php artisan migrate
npm install
npm run build
php artisan serve
```

In einem zweiten Terminal:

```powershell
$env:MOCK_PORT="8001"
node openuntis-mock/mock-server.cjs
```

## Produktionsumgebung

Für einen produktiven Host müssen `APP_URL`, `APP_KEY` und `MOCK_API_URL` gesetzt werden. Die SQLite-Datenbank muss persistent gemountet oder durch eine andere Laravel-kompatible Datenbank ersetzt werden.

## Online bereitstellen ohne lokale Installation

Wenn auf dem lokalen Gerät keine ausführbaren Dateien installiert werden dürfen, kann das Projekt direkt aus GitHub auf Render bereitgestellt werden.

Voraussetzung:

- Das Repository enthält `render.yaml` im Root.

Deployment in Render (nur Browser):

1. In Render: **New +** -> **Blueprint** wählen.
2. GitHub-Repository `Dymagic-stack/untis-sync-hub` verbinden.
3. `render.yaml` auswählen und Deployment starten.

Dabei werden zwei Services erstellt:

- `openuntis-mock` als öffentliche Docker-Web-App (Free-Plan-kompatibel)
- `untis-sync-hub` als öffentliche Web-App

Hinweis zum Free-Tier:

- Render Free unterstützt keine Persistent Disks. SQLite-Daten sind daher nicht dauerhaft und können bei Redeploy/Neustart verloren gehen.

Nach erfolgreichem Deploy ist die Anwendung über die Render-URL des Services `untis-sync-hub` erreichbar.
