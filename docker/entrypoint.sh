#!/bin/sh
set -e

cd /var/www/html

mkdir -p database
[ -f database/database.sqlite ] || touch database/database.sqlite

if [ -z "${APP_KEY:-}" ]; then
    php artisan key:generate --force
fi

php artisan migrate --force
php artisan storage:link --force >/dev/null 2>&1 || true
php artisan config:cache
php artisan route:cache

nginx
exec "$@"
