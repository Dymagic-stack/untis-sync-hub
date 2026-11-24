#!/bin/sh
set -e

cd /var/www/html

mkdir -p database
[ -f database/database.sqlite ] || touch database/database.sqlite

php-fpm -D

php artisan migrate --force
php artisan storage:link --force >/dev/null 2>&1 || true
php artisan config:cache
php artisan route:cache

exec "$@"
