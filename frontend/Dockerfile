# syntax=docker/dockerfile:1

# The public Next.js site. Build context is `frontend/`.
#
# NEXT_PUBLIC_* values are inlined into the client bundle at BUILD time, so they
# arrive as build args, not runtime env. Changing the public hostname therefore
# means a rebuild, not a restart (plan §3.3).

# ---------------------------------------------------------------------------
# Stage 1 — Dependencies
# ---------------------------------------------------------------------------
FROM node:22.23.4-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# ---------------------------------------------------------------------------
# Stage 2 — Build
# ---------------------------------------------------------------------------
FROM node:22.23.4-alpine AS build

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Baked into the client bundle — see the header.
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SITE_URL
ARG IMAGES_ALLOW_LOCAL_IP

ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL} \
    NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL} \
    IMAGES_ALLOW_LOCAL_IP=${IMAGES_ALLOW_LOCAL_IP} \
    NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=production

# Pages that fetch at build time would need the API up, which it is not during
# `docker compose build`. `apiGet` calls `connection()`, so no API-backed route
# is prerendered — a new build-time fetch that bypasses it will fail loudly
# here rather than silently baking stale data.
RUN npm run build

# ---------------------------------------------------------------------------
# Stage 3 — Runtime
# ---------------------------------------------------------------------------
FROM node:22.23.4-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# `output: "standalone"` traces exactly the files the server needs, so
# node_modules is not copied wholesale.
COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static

# The traced server runs unprivileged; the image's `node` user already exists.
USER node

EXPOSE 3000

# Not `npm start` — standalone output is a plain Node server.
CMD ["node", "server.js"]
