# syntax=docker/dockerfile:1

# The Laravel admin panel and API, as PHP-FPM. Build context is the repo root.
#
# Three stages: Composer resolves PHP dependencies, Node builds the admin
# panel's Vite assets, and the runtime carries both plus the application code.
# Neither toolchain survives into the final image.
#
# PHP is pinned to 8.4: composer.json allows ^8.3, but composer.lock is resolved
# against 8.4 (deployment.md §2). The patch level is pinned too, at or above
# 8.4.27 (CVE-2026-109618/109619), so a stale cached base image can't ship.

# ---------------------------------------------------------------------------
# Stage 1 — PHP dependencies
# ---------------------------------------------------------------------------
FROM composer:2 AS vendor

WORKDIR /app

# Copied first and alone so this layer is reused whenever only app code changes.
COPY composer.json composer.lock ./

# --no-scripts: the post-install hooks run artisan, which needs the application
# code and an .env that do not exist yet at this point.
RUN composer install \
      --no-dev \
      --no-scripts \
      --no-autoloader \
      --prefer-dist \
      --no-interaction

COPY . .

RUN composer dump-autoload --no-dev --optimize --classmap-authoritative

# ---------------------------------------------------------------------------
# Stage 2 — Admin panel assets (Inertia + React, built by Vite)
# ---------------------------------------------------------------------------
FROM node:22.23.4-alpine AS assets

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY vite.config.ts tsconfig.json ./
COPY resources ./resources

# Vite reads the manifest path from the Laravel plugin, which expects to write
# into public/build.
RUN npm run build

# ---------------------------------------------------------------------------
# Stage 3 — Runtime
# ---------------------------------------------------------------------------
FROM php:8.4.27-fpm-alpine AS runtime

# Build-only headers, removed in the same layer so they never ship.
RUN apk add --no-cache --virtual .build-deps \
        $PHPIZE_DEPS \
        icu-dev \
        libzip-dev \
        libpng-dev \
        libjpeg-turbo-dev \
        libwebp-dev \
        freetype-dev \
        oniguruma-dev \
    && apk add --no-cache \
        icu-libs \
        libzip \
        libpng \
        libjpeg-turbo \
        libwebp \
        freetype \
        mysql-client \
    && docker-php-ext-configure gd --with-jpeg --with-webp --with-freetype \
    && docker-php-ext-install -j"$(nproc)" \
        bcmath \
        exif \
        gd \
        intl \
        mbstring \
        opcache \
        pdo_mysql \
        zip \
    && apk del .build-deps

COPY docker/app/php.ini /usr/local/etc/php/conf.d/zz-app.ini

WORKDIR /var/www/html

# Application code, then the two build outputs over the top.
COPY --chown=www-data:www-data . .
COPY --from=vendor --chown=www-data:www-data /app/vendor ./vendor
COPY --from=assets --chown=www-data:www-data /app/public/build ./public/build

# `storage/app/public` is a volume mount at runtime (uploads), and
# `public/storage` is served by the web container from that same volume rather
# than through `artisan storage:link` — see the plan §4.2.
RUN rm -rf public/storage \
    && mkdir -p storage/framework/cache storage/framework/sessions \
                storage/framework/views storage/app/public bootstrap/cache \
    && chown -R www-data:www-data storage bootstrap/cache \
    && chmod -R ug+rwX storage bootstrap/cache

COPY docker/app/entrypoint.sh /usr/local/bin/entrypoint
RUN chmod +x /usr/local/bin/entrypoint

EXPOSE 9000

ENTRYPOINT ["entrypoint"]
CMD ["php-fpm"]
