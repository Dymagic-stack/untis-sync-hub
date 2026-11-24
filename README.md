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
docker compose up --build -d
docker compose exec app php artisan migrate --force
```

Nach dem Start:

- Anwendung: <http://localhost:8080>
- Mock-API: <http://localhost:8000>

Stoppen:

```powershell
docker compose down
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
node openuntis-mock/mock-server.cjs
```

Laravel läuft standardmäßig unter <http://localhost:8000>, daher sollte der Mock in diesem Modus auf einem anderen Port gestartet werden:

```powershell
$env:MOCK_PORT="8001"
node openuntis-mock/mock-server.cjs
```

## Produktionsumgebung

Für den Containerstart können Umgebungswerte wie `APP_KEY`, `APP_URL`, `MOCK_API_URL`, `DB_CONNECTION` und Session-/Cache-Treiber gesetzt werden. `APP_KEY` muss stabil und geheim bleiben.

Die SQLite-Datenbank muss persistent gemountet oder durch eine andere Laravel-kompatible Datenbank ersetzt werden.
