#!/bin/sh
set -e

# Runs on every start of the app container, before php-fpm.
#
# Config caching happens here rather than at build time on purpose: `artisan
# optimize` bakes .env values into bootstrap/cache, and at build time the real
# APP_URL is not known. Image URLs for the public site are built from APP_URL,
# so a stale one means broken images (plan §4.3).

# Only the long-running server does the boot sequence below. One-off commands —
# `compose run app php artisan key:generate --show`, `compose exec app php
# artisan migrate` — go straight through, or generating the very first APP_KEY
# would be blocked by the check that requires one.
if [ "$1" != "php-fpm" ]; then
    exec "$@"
fi

# The volume mount lands on top of the image's directory, so ownership has to be
# fixed at runtime; a fresh named volume comes up owned by root.
chown -R www-data:www-data storage/app/public || true

if [ -z "${APP_KEY}" ]; then
    echo "entrypoint: APP_KEY is empty — generate one with:" >&2
    echo "  docker compose run --rm app php artisan key:generate --show" >&2
    echo "and put it in .env before starting the stack." >&2
    exit 1
fi

# Wait for MySQL. compose's `depends_on: healthy` covers the first boot, but a
# db restart while the app is live would otherwise fail the caches below.
until php -r 'new PDO(
        "mysql:host=".getenv("DB_HOST").";port=".(getenv("DB_PORT") ?: 3306),
        getenv("DB_USERNAME"),
        getenv("DB_PASSWORD")
    );' 2>/dev/null; do
    echo "entrypoint: waiting for the database..."
    sleep 2
done

# Rebuilt from the current env on every start. `optimize:clear` first so a
# half-written cache from a killed container cannot persist.
php artisan optimize:clear
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Migrations are deliberately NOT run here. A container restart must never
# change the schema on its own. Run them explicitly:
#   docker compose exec app php artisan migrate --force

exec "$@"
