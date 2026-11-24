#!/bin/sh
set -e

cd /var/www/html

mkdir -p database storage/framework/cache storage/framework/sessions storage/framework/views storage/logs
[ -f database/database.sqlite ] || touch database/database.sqlite
chown -R www-data:www-data database storage bootstrap/cache

if [ -z "${APP_KEY:-}" ] && ! grep -q '^APP_KEY=base64:' .env 2>/dev/null; then
    php artisan key:generate --force --no-ansi
fi

php-fpm -D

php artisan migrate --force
php artisan storage:link --force >/dev/null 2>&1 || true
php artisan config:cache
php artisan route:cache

exec "$@"
