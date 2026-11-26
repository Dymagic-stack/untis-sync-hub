#!/bin/sh
set -e

cd /var/www/html

mkdir -p database storage/framework/cache storage/framework/sessions storage/framework/views storage/logs
[ -f database/database.sqlite ] || touch database/database.sqlite
chown -R www-data:www-data database storage bootstrap/cache

# Render generateValue liefert kein Laravel-Key-Format. Fuer stabile Web-Routen
# erzwingen wir einen gueltigen APP_KEY mit base64:-Prefix.
if [ -z "${APP_KEY:-}" ] || ! echo "${APP_KEY}" | grep -q '^base64:'; then
    export APP_KEY="base64:$(php -r 'echo base64_encode(random_bytes(32));')"
fi

php-fpm -D

php artisan migrate --force
# Demo-Datensatz fuer Vergleiche (nur wenn weniger als 80 Moodle-Eintraege vorhanden sind).
php artisan db:seed --class=DemoAbsenceSeeder --force || true
php artisan storage:link --force >/dev/null 2>&1 || true
# Cache-Warmup ist optional und darf den Start im Free-Tier nicht blockieren.
php artisan config:cache || true
php artisan route:cache || true

exec "$@"
