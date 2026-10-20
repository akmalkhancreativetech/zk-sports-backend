# syntax=docker/dockerfile:1

# Nginx in front of the app container. Build context is the repo root.
#
# This image carries its own copy of `public/` — the static files and the Vite
# build output — rather than sharing the app container's filesystem through a
# volume. Sharing would mean both containers race to populate it on first boot,
# and a stale volume then shadows a fresh deploy (plan §3.2).
#
# Uploads are the exception: those arrive at runtime on a volume mounted at
# public/storage, read-only.

# Same two build stages as the app image, so the assets are identical.
FROM node:22-alpine AS assets

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY vite.config.ts tsconfig.json ./
COPY resources ./resources

RUN npm run build

FROM nginx:1.27-alpine AS runtime

# Only the document root. The PHP never runs here, but nginx has to see the
# filenames to decide what to hand to FastCGI.
COPY public /var/www/html/public
COPY --from=assets /app/public/build /var/www/html/public/build

# The official image runs envsubst over /etc/nginx/templates/*.template at
# start, so the public hostname stays an env var instead of being baked in.
COPY docker/web/default.conf.template /etc/nginx/templates/default.conf.template

EXPOSE 80
