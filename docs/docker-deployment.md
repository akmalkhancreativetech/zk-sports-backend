# Docker Deployment

How to run the whole zk-sports stack — Laravel admin panel + API, Next.js public site, MySQL — in containers on one fresh Ubuntu Server LTS machine, reached over Tailscale.

The design and the reasoning behind it are in `docs/docker-deployment-plan.md`. This file is the runbook: follow it in order, stop at the first failure.

## What runs where

Only **Docker and Tailscale** are installed on the host. Nginx, PHP, Node and MySQL all live in containers.

```
Internet ── HTTPS ──▶ Tailscale Funnel (host)
                        │
                        ├─ :443   ──▶ 127.0.0.1:3000 ──▶ [site]  Next.js
                        │
                        └─ :8443  ──▶ 127.0.0.1:8080 ──▶ [web]   Nginx ──▶ [app] PHP-FPM ──▶ [db] MySQL
```

| What | Public URL |
| --- | --- |
| Public site | `https://zk-server.tail1234.ts.net` |
| Admin panel | `https://zk-server.tail1234.ts.net:8443/admin` |
| API | `https://zk-server.tail1234.ts.net:8443/api/v1/...` |

> **Throughout**, replace `zk-server.tail1234.ts.net` with your machine's real Tailscale name (`tailscale status --self --json | grep DNSName`) and `akmal` with your SSH user.

---

## 0. Before you start

1. **Commit and push everything.** The server clones from GitHub.
2. In the [Tailscale admin console](https://login.tailscale.com/admin/dns) → **DNS**, enable **MagicDNS** and **HTTPS Certificates**.

---

## 1. Base system

```bash
sudo apt update && sudo apt full-upgrade -y
sudo apt install -y git curl ca-certificates ufw
sudo timedatectl set-timezone Asia/Karachi   # or your timezone
```

### Swap

`next build` and the admin panel's Vite build both run on this machine. On a server with less than ~4 GB RAM they can be OOM-killed, which shows up as an unexplained `exit code 137` mid-build.

```bash
free -h                         # if Swap is 0B, add some:
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### Firewall

Funnel and SSH-over-Tailscale both arrive on `tailscale0`, so nothing is open to the public network.

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow in on tailscale0
sudo ufw enable
```

> Do this from a Tailscale SSH session, not a LAN one.
>
> **UFW does not filter Docker's published ports.** Docker writes them straight into `iptables`. This stack binds every published port to `127.0.0.1`, which is what actually protects them — step 8 verifies it rather than assuming.

---

## 2. Docker Engine

The `docker.io` package in Ubuntu's own repository lags badly. Use Docker's:

```bash
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] \
https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

Run Docker without `sudo` (log out and back in afterwards):

```bash
sudo usermod -aG docker $USER
newgrp docker
docker run --rm hello-world
docker compose version
```

---

## 3. Tailscale

```bash
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up --ssh
tailscale status --self --json | grep DNSName    # note this name
```

---

## 4. Get the code

```bash
sudo mkdir -p /srv && sudo chown $USER:$USER /srv
cd /srv
git clone https://github.com/<you>/zk-sports.git
cd zk-sports
```

For a private repo, use a fine-grained personal access token with read-only Contents permission, and cache it:

```bash
git config --global credential.helper store
# The first `git pull` will prompt once; use the token as the password.
```

---

## 5. Configure

```bash
cp .env.docker.example .env
nano .env
```

Fill in every `CHANGE-ME` and replace the Tailscale hostname in all five places. Then generate the app key:

```bash
docker compose run --rm app php artisan key:generate --show
```

Copy the whole `base64:...` string into `APP_KEY=` in `.env`.

> The first run of that command builds the app image, so it takes a few minutes.

**Check these before moving on** — each one causes a specific, confusing failure:

| Value | Must be | If wrong |
| --- | --- | --- |
| `APP_URL` | ends `:8443` | Broken image URLs; login redirects to the wrong port |
| `APP_KEY` | a `base64:` string | The app container refuses to start |
| `PUBLIC_API_ORIGIN` | hostname **with** `:8443`, no scheme | Laravel builds `http://localhost` links |
| `NEXT_PUBLIC_API_URL` | `https://...:8443` | The public site's browser-side calls fail |
| `NEXT_PUBLIC_SITE_URL` | `https://...` (no port) | Wrong canonical URLs and OG tags |

---

## 6. Build and start

```bash
docker compose build          # several minutes on first run
docker compose up -d
docker compose ps             # all four should be running/healthy
```

Create the schema:

```bash
docker compose exec app php artisan migrate --force
```

> Migrations are deliberately **not** automatic. A container restart must never alter the schema on its own.

### Create the admin user

Don't run `db:seed` in production — it creates test users whose password is literally `password`.

```bash
docker compose exec app php artisan tinker --execute '
App\Models\User::create([
    "name" => "Your Name",
    "email" => "you@example.com",
    "password" => "CHANGE-ME-strong-password",
    "role" => App\Enums\UserRole::Admin,
]);'
```

The password is hashed by the model's `hashed` cast.

---

## 7. Put it on the internet

```bash
sudo tailscale funnel --bg --https=443  http://127.0.0.1:3000
sudo tailscale funnel --bg --https=8443 http://127.0.0.1:8080
tailscale funnel status
```

The first run may print a link asking you to enable Funnel for the tailnet. Approve it, then run the commands again. The configuration survives reboots; `sudo tailscale funnel reset` undoes it.

> **Private to your tailnet instead?** Use `tailscale serve` with the same flags.

---

## 8. Check it works

On the server:

```bash
curl -s http://127.0.0.1:8080/up | head -c 50          # Laravel health
curl -s http://127.0.0.1:8080/api/v1/health            # {"ok":true}
curl -I http://127.0.0.1:3000                          # 200 from Next
```

**Verify the ports are not exposed to the LAN.** From a different machine on the same network, using the server's LAN IP (not its Tailscale name):

```bash
curl --max-time 5 http://<server-lan-ip>:8080/up       # must fail/time out
curl --max-time 5 http://<server-lan-ip>:3000          # must fail/time out
```

If either answers, a published port lost its `127.0.0.1:` prefix in `compose.yaml`.

Then, from any device:

- [ ] `https://zk-server.tail1234.ts.net` — public site renders.
- [ ] `https://zk-server.tail1234.ts.net:8443/admin` — login page; you can sign in.
- [ ] Upload a product image in the admin, then find it on the public site. The site caches API responses for 1–5 minutes.

That last one is the real test: it proves the uploads volume is shared correctly between the `app` and `web` containers.

---

## 9. Deploying updates

```bash
cd /srv/zk-sports
git pull
docker compose up -d --build
docker compose exec app php artisan migrate --force
```

`up -d --build` replaces only the containers whose image changed. Expect a few seconds of downtime — this stack has no zero-downtime story, by choice.

**If you changed any `NEXT_PUBLIC_*` or `IMAGES_ALLOW_LOCAL_IP` value in `.env`, the site needs a rebuild, not a restart:**

```bash
docker compose up -d --build site
```

Those values are inlined into the browser bundle when the image is built. A restart will appear to do nothing, which is the single most confusing thing about this stack.

Other `.env` changes (Laravel's) only need:

```bash
docker compose restart app
```

The app container re-caches config on every start.

---

## 10. Backups

Two things are irreplaceable: the database and the uploads. Both live in named volumes.

```bash
sudo mkdir -p /srv/backups && sudo chown $USER:$USER /srv/backups

cat > /srv/zk-sports/backup.sh <<'SH'
#!/bin/bash
set -euo pipefail
cd /srv/zk-sports
source .env
STAMP=$(date +%F)
OUT=/srv/backups

docker compose exec -T db mysqldump \
    -u root -p"$DB_ROOT_PASSWORD" --single-transaction --routines \
    "$DB_DATABASE" | gzip > "$OUT/db-$STAMP.sql.gz"

docker run --rm \
    -v zk-sports_uploads:/data:ro \
    -v "$OUT":/backup alpine \
    tar czf "/backup/uploads-$STAMP.tar.gz" -C /data .

find "$OUT" -name '*.gz' -mtime +14 -delete
SH

chmod +x /srv/zk-sports/backup.sh
```

Daily at 02:30:

```bash
( crontab -l 2>/dev/null; echo "30 2 * * * /srv/zk-sports/backup.sh >> /srv/backups/backup.log 2>&1" ) | crontab -
```

Run it once by hand and confirm both files appear, non-empty. **A backup you have never restored is a hypothesis** — restoring into a scratch volume is the only way to know it works.

### Restoring

```bash
# Database
gunzip -c /srv/backups/db-YYYY-MM-DD.sql.gz | \
  docker compose exec -T db mysql -u root -p"$DB_ROOT_PASSWORD" zk_sports

# Uploads
docker run --rm -v zk-sports_uploads:/data \
  -v /srv/backups:/backup alpine \
  tar xzf /backup/uploads-YYYY-MM-DD.tar.gz -C /data
```

---

## 11. Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| `app` container exits immediately | `APP_KEY` empty in `.env`. The entrypoint says so — `docker compose logs app` |
| Build killed, `exit code 137` | Out of memory. Add swap (step 1) |
| Images upload in admin but 404 on the public site | The `uploads` volume is not mounted in both `app` and `web`. `docker compose config \| grep -A3 volumes` |
| Login redirects to `http://localhost` | `PUBLIC_API_ORIGIN` wrong or missing `:8443` |
| Public site shows the old API hostname | `NEXT_PUBLIC_*` changed without a rebuild — `docker compose up -d --build site` |
| `.env` change ignored by Laravel | Config is cached at container start — `docker compose restart app` |
| `502 Bad Gateway` from nginx | The `app` container is down or still booting — `docker compose logs app` |
| MySQL "access denied" after changing `DB_PASSWORD` | The volume keeps the **original** password. Either change it in MySQL, or destroy the volume and restore from backup |
| URL not reachable at all | `tailscale funnel status`; check MagicDNS and HTTPS certificates are on |

Logs:

```bash
docker compose logs -f app       # Laravel + PHP-FPM
docker compose logs -f web       # nginx access/error
docker compose logs -f site      # Next.js
```

### Known limitation: API rate limit

`/api/v1` is limited to 60 requests per minute per IP. Every request from the public site reaches Laravel from the **`site` container's** address, so all visitors share one budget. Caching keeps this low for now; if the site gets busy, exempt the internal Docker network in `AppServiceProvider`.
