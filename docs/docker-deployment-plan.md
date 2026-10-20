# Docker Deployment — Plan

Repackage the zk-sports stack — Laravel admin panel + API, Next.js public site, MySQL — as containers on one fresh Ubuntu Server LTS machine, reached over Tailscale Funnel.

> `deployment.md` at the repo root is the **bare-metal** runbook (nginx + php-fpm + systemd + host MySQL). This plan does not edit it. When the Docker path is verified working, `deployment.md` gets replaced by the Docker runbook so there is only one deployment story in the repo — see §8.

---

## 1. Decisions already made

Confirmed 2026-10-15.

| Question | Decision | Consequence |
|---|---|---|
| Server state | **Fresh**, nothing deployed | No data migration, no teardown of old services |
| MySQL | **Container + named volume** | Whole stack is one `docker compose up`; backups become `exec mysqldump` |
| Image builds | **On the server, from a git clone** | Deploy is `git pull && docker compose up -d --build`. No registry. Costs build RAM — see §6.1 |
| Ingress | **Tailscale Funnel, host-installed** | Containers bind to loopback only; Funnel forwards into them. Cookie/CORS config is unchanged from the bare-metal guide |

### 1.1 Topology

```
Internet ── HTTPS ──▶ Tailscale Funnel (host, not containerised)
                        │
                        ├─ :443   ──▶ 127.0.0.1:3000 ──▶ [site]  Next.js standalone
                        │
                        └─ :8443  ──▶ 127.0.0.1:8080 ──▶ [web]   Nginx ──▶ [app] PHP-FPM
                                                                   │
                        docker network (internal, no published ports)
                                      [site] ──▶ http://web ──▶ Laravel API
                                      [app]  ──▶ [db] MySQL 8
```

Four services. Only `web` and `site` publish ports, and both bind **127.0.0.1 only** — the firewall rules from `deployment.md` §1 still apply, and Docker must not be allowed to punch through them (see §6.2, this is a real trap).

---

## 2. Phases and checkpoints

| Phase | Delivers | Checkpoint |
|---|---|---|
| 0 | `.dockerignore`, `output: "standalone"` in `next.config.ts` | `npm run build` in `frontend/` still succeeds locally |
| 1 | `docker/` dir: Dockerfiles for app, web, site + nginx conf | `docker compose build` completes |
| 2 | `compose.yaml`, `.env.docker.example`, entrypoint | `docker compose up -d` → all four healthy locally |
| 3 | Local smoke test against the real stack | `/api/v1/health` 200, admin login page renders, home page lists products |
| 4 | `docs/docker-deployment.md` runbook | Akmal follows it on the server end to end |
| 5 | `deployment.md` replaced, backup + update procedures | Backup restores into a clean volume |

Phases 0–3 happen on this machine. Phase 4 is the server.

---

## 3. The images

### 3.1 `app` — PHP-FPM + Laravel

Multi-stage, because two toolchains are needed to produce one runtime:

1. `composer` stage — `composer install --no-dev --optimize-autoloader`
2. `node` stage — `npm ci && npm run build` for the **admin panel's** Vite assets into `public/build`
3. runtime — `php:8.4-fpm-alpine` with `pdo_mysql mbstring xml curl zip bcmath intl gd`, plus the vendor dir and `public/build` copied in

`composer.json` allows `^8.3` but the lock is resolved against 8.4, so the base image is pinned to 8.4 — same reasoning as `deployment.md` §2.

**Upload limits** must be set in the image (`upload_max_filesize=20M`, `post_max_size=25M`); the admin panel uploads product and slider images and PHP's 2 MB default silently truncates them.

### 3.2 `web` — Nginx

`nginx:alpine`, config adapted from `deployment.md` §9 with `fastcgi_pass app:9000` instead of a unix socket.

**It gets its own copy of `public/`**, copied from the app build stages. The alternative — sharing the app's filesystem through a volume — means the two containers race on who populates it, and a stale volume then shadows a fresh deploy. Copying is boring and correct.

### 3.3 `site` — Next.js

`node:22-alpine`, two stages (build → runtime).

This needs **`output: "standalone"`** in `next.config.ts`, which the project does not currently set. Without it the runtime image has to carry all of `node_modules` (hundreds of MB and a slower deploy); with it, Next emits a self-contained `server.js` plus only the files it actually traces.

**`NEXT_PUBLIC_*` values are baked at build time**, so they are `ARG`s, not runtime env:

| Variable | Value | Why |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `https://<machine>.<tailnet>.ts.net:8443` | What browsers and image URLs use |
| `NEXT_PUBLIC_SITE_URL` | `https://<machine>.<tailnet>.ts.net` | `metadataBase` for canonicals and OG — `.ai/rules/src.md` |
| `IMAGES_ALLOW_LOCAL_IP` | `true` | A `ts.net` name resolves to 100.x on the server; Next 16's SSRF guard refuses to optimize it otherwise |

A change to any of these is a **rebuild**, not a restart. That is the single most confusing thing about this stack and the runbook will say so in bold.

### 3.4 `db` — MySQL 8

Stock `mysql:8` image, `utf8mb4` / `utf8mb4_unicode_ci` to match `config/database.php`, named volume at `/var/lib/mysql`, **no published port** — only the app container reaches it.

---

## 4. Runtime wiring

### 4.1 Server-side API URL changes

On bare metal the Next server called `http://127.0.0.1:8080`. In Docker that loopback is the *container's* own, so it becomes:

```dotenv
API_URL=http://web
```

Internal, never leaves the Docker network, and skips Tailscale entirely. `NEXT_PUBLIC_API_URL` stays the public `:8443` URL because browsers resolve it, not the container.

### 4.2 Uploads must outlive the container

`storage/app/public` is a named volume mounted into **both**:

- `app` at `/var/www/html/storage/app/public` — where Laravel writes
- `web` at `/var/www/html/public/storage` **read-only** — where Nginx serves from

This deliberately replaces `php artisan storage:link`. A symlink created inside a container points at a path that the Nginx container does not have, and baking the symlink into an image that is then shadowed by a volume mount is exactly the configuration that produces "images upload fine but 404 on the public site".

### 4.3 Config caching happens at container start, not build

`php artisan optimize` bakes `.env` values into `bootstrap/cache`. Doing that at **build** time would freeze whatever env the builder had — including a wrong `APP_URL`, which is what image URLs are built from.

So the app entrypoint runs `config:cache`, `route:cache`, `view:cache` on start, once env is present, then execs php-fpm.

**Migrations are not in the entrypoint.** They are an explicit, documented step (`docker compose exec app php artisan migrate --force`) so a restart can never silently alter the schema.

### 4.4 Secrets

`APP_KEY` is generated **once on the server** and lives in the server's `.env`, never in an image or in git. `.env.docker.example` ships the shape; `.env` is gitignored already.

---

## 5. What stays the same

Worth stating, because it is most of the security surface and none of it needs to change:

- `SESSION_SECURE_COOKIE=true`, `SESSION_DOMAIN=null`, `SANCTUM_STATEFUL_DOMAINS=<machine>.<tailnet>.ts.net`. Funnel serves the site on `:443` and the API on `:8443` of the **same hostname**, and cookies ignore ports — so the same-site premise from `docs/frontend-plan.md` §1.2 holds without a subdomain split.
- `QUEUE_CONNECTION=sync`, `MAIL_MAILER=log`. Nothing is queued yet, so no worker container. Adding one later is a compose service, not a redesign.
- `SESSION_DRIVER=database`, `CACHE_STORE=database`. Both live in MySQL, so they survive a container rebuild for free. No Redis container is justified yet.

---

## 6. Known traps

### 6.1 Build RAM

`next build` plus the admin panel's Vite build on a small server can OOM. The runbook will check for swap and add 2 GB if absent, before the first build.

### 6.2 Docker bypasses UFW

Published ports are written straight into `iptables` by the Docker daemon and are **not** filtered by UFW. The firewall from `deployment.md` §1 would look correct while the port was wide open to the LAN.

Mitigated by binding every published port explicitly to `127.0.0.1` (`127.0.0.1:8080:80`, not `8080:80`). The runbook will verify this from another machine rather than take it on trust.

### 6.3 The API rate limit gets stricter, not looser

`/api/v1` is 60/min per IP. Every public-site request now arrives at Laravel from the **`site` container's** IP, so all visitors share one budget — the same limitation as bare metal, but with a single container IP it is easier to hit. Caching keeps it low for now; the fix, when needed, is to exempt the internal Docker network in `AppServiceProvider`.

### 6.4 Build context size

Without `.dockerignore`, the build context includes `node_modules`, `vendor`, `frontend/.next` and `.git` — slow, and it can poison an image with host-built artefacts. Phase 0.

---

## 7. Out of scope

Deliberately not doing: a registry or CI pipeline (you chose server-side builds), Redis, a queue worker, horizontal scaling, zero-downtime deploys (this stack has a few seconds of downtime on `up -d`), and containerising Tailscale.

---

## 8. Cleanup

When the Docker path is verified on the server, **`deployment.md` is replaced** by `docs/docker-deployment.md` rather than both being kept. Two runbooks for one app is how a server ends up half-configured by each. The bare-metal version stays available in git history.
