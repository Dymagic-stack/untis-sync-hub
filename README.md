# atiw-sync-hub

Laravel/Vue-Anwendung zur Erfassung, Prüfung und Synchronisierung von Fehlzeiten am ATIW Berufskolleg Paderborn.

## Struktur

- `app/`, `routes/`, `database/`, `resources/` – Laravel-Backend und Vue-Frontend
- `openuntis-mock/` – isolierte synthetische Test-API
- `docker-compose.yml` – lokaler Produktivstack
- `Dockerfile` – PHP-FPM, Nginx und Vue-Build

## Lokaler Start

```powershell
docker compose up --build
```

Die Anwendung ist anschließend unter `http://localhost:8000` verfügbar.

## Entwicklung ohne Docker

Laravel benötigt PHP 8.3, Composer und Node.js:

```powershell
composer install
npm install
copy .env.example .env
php artisan key:generate
php artisan migrate
php artisan serve
npm run dev
```

## Datenbank

Standardmäßig wird SQLite verwendet. Für eine lokale Neuinitialisierung:

```powershell
php artisan migrate:fresh
```

## Sicherheit

- Keine echten Schülerdaten verwenden.
- `.env` enthält keine Produktivgeheimnisse und wird nicht versioniert.
- Der WebUntis-Zugriff erfolgt ausschließlich lesend; der Mock liefert synthetische Daten.
