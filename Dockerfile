FROM php:8.3-fpm-alpine AS app

RUN apk add --no-cache nginx nodejs npm sqlite-libs sqlite-dev oniguruma-dev libpng-dev libzip-dev \
    && docker-php-ext-install pdo_sqlite mbstring bcmath gd zip

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html
COPY composer.json composer.lock ./
RUN composer install --no-dev --no-interaction --prefer-dist --optimize-autoloader --no-scripts

COPY package.json package-lock.json ./
RUN npm ci

COPY . ./
RUN npm run build \
    && composer dump-autoload --optimize --no-dev

RUN mkdir -p /run/nginx /var/www/html/storage/framework/cache /var/www/html/storage/framework/sessions \
    /var/www/html/storage/framework/views /var/www/html/storage/logs \
    && chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache

COPY docker/nginx.conf /etc/nginx/http.d/default.conf
COPY docker/php.ini /usr/local/etc/php/conf.d/99-app.ini
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 80
ENTRYPOINT ["/entrypoint.sh"]
CMD ["php-fpm", "-F"]
