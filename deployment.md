# Deployment

How to deploy the admin panel and API (Laravel) and the public site (Next.js) onto one fresh Ubuntu Server LTS machine. The server has no static IP and no domain, and is reached through Tailscale.

## How it fits together

Tailscale **Funnel** gives the server a public HTTPS address of the form `https://<machine>.<tailnet>.ts.net`, with a valid certificate. The connection is outbound from the server, so you don't open any ports on your router or firewall and don't need a static IP.

Funnel only exposes ports **443**, **8443** and **10000**. That gives one port per app:

```
Internet ── HTTPS ──▶ Tailscale Funnel  (zk-server.tail1234.ts.net)
                        │
                        ├─ :443   ──▶ 127.0.0.1:3000  Next.js public site      (systemd)
                        │
                        └─ :8443  ──▶ 127.0.0.1:8080  Nginx ─▶ PHP-FPM ─▶ Laravel
                                                      (admin panel, /api/v1, /storage images)

Next.js server ── http://127.0.0.1:8080 ──▶ Laravel API   (internal, never leaves the machine)
MySQL on 127.0.0.1:3306                                  (local only)
```

| What | Public URL |
| --- | --- |
| Public site | `https://zk-server.tail1234.ts.net` |
| Admin panel | `https://zk-server.tail1234.ts.net:8443/admin` |
| API | `https://zk-server.tail1234.ts.net:8443/api/v1/...` |

> **Throughout this guide**, replace:
> - `zk-server.tail1234.ts.net` with your machine's real Tailscale name. Run `tailscale status --self --json | grep DNSName` on the server, or look in the Tailscale admin console under **Machines**.
> - `akmal` with your SSH user on the server.
>
> Only want the site reachable from your own Tailscale devices, not the public internet? Use `tailscale serve` instead of `tailscale funnel` in step 11. Everything else stays the same.

---

## 0. Before you start (on your PC)

1. **Commit and push everything.** The server clones from GitHub, so anything not pushed won't be deployed.
2. In the [Tailscale admin console](https://login.tailscale.com/admin/dns), go to **DNS** and turn on **MagicDNS** and **HTTPS Certificates**.

---

## 1. Base system

SSH in over Tailscale, then:

```bash
sudo apt update && sudo apt full-upgrade -y
sudo apt install -y git curl unzip ca-certificates software-properties-common ufw
sudo timedatectl set-timezone Asia/Karachi   # or your timezone
```

### Firewall

Funnel and SSH-over-Tailscale both arrive on the `tailscale0` interface, so nothing needs to be open to the public network.

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow in on tailscale0
sudo ufw enable
sudo ufw status verbose
```

> Do this from a Tailscale SSH session, not a LAN session. If Tailscale is down, you'd lose access until you're at the machine.

---

## 2. PHP 8.4+ and PHP-FPM

The app needs PHP **8.4 or newer**: `composer.json` allows `^8.3`, but the lock file is resolved against 8.4. Check what Ubuntu offers:

```bash
apt-cache policy php
```

If the candidate version is **8.4 or newer**, install the unversioned packages:

```bash
sudo apt install -y php-fpm php-cli php-mysql php-mbstring php-xml php-curl \
  php-zip php-bcmath php-intl php-gd php-sqlite3
```

If it's older than 8.4, add the Ondřej Surý PPA and install `php8.4-*` instead:

```bash
sudo add-apt-repository -y ppa:ondrej/php && sudo apt update
sudo apt install -y php8.4-fpm php8.4-cli php8.4-mysql php8.4-mbstring php8.4-xml \
  php8.4-curl php8.4-zip php8.4-bcmath php8.4-intl php8.4-gd php8.4-sqlite3
```

Check:

```bash
php -v
ls /run/php/          # note the socket name, e.g. php8.4-fpm.sock (php-fpm.sock is a symlink to it)
```

### Upload size

The admin panel uploads product and slider images. PHP's default limit is 2 MB, so raise it. Replace `8.4` with your version:

```bash
PHPV=$(php -r 'echo PHP_MAJOR_VERSION.".".PHP_MINOR_VERSION;')
sudo sed -i 's/^upload_max_filesize.*/upload_max_filesize = 20M/; s/^post_max_size.*/post_max_size = 25M/' /etc/php/$PHPV/fpm/php.ini
sudo systemctl restart php$PHPV-fpm
```

---

## 3. Composer

```bash
cd /tmp
curl -sS https://getcomposer.org/installer -o composer-setup.php
sudo php composer-setup.php --install-dir=/usr/local/bin --filename=composer
rm composer-setup.php
composer --version
```

---

## 4. MySQL

```bash
sudo apt install -y mysql-server
sudo systemctl enable --now mysql
sudo mysql_secure_installation      # answer Y to everything; the root login stays socket-auth
```

Create the database and an app user. Pick your own strong password:

```bash
sudo mysql <<'SQL'
CREATE DATABASE zk_sports CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'zk_sports'@'localhost' IDENTIFIED BY 'CHANGE-ME-strong-password';
GRANT ALL PRIVILEGES ON zk_sports.* TO 'zk_sports'@'localhost';
FLUSH PRIVILEGES;
SQL
```

MySQL listens on `127.0.0.1` only by default. Keep it that way.

---

## 5. Node.js (LTS)

Next.js 16 needs Node ≥ 20.9, and Vite 8 needs ≥ 20.19. Install the current LTS from NodeSource:

```bash
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt install -y nodejs
node -v && npm -v
```

Both the admin panel's assets and the Next.js site are built with this one Node install.

---

## 6. Nginx

```bash
sudo apt install -y nginx
sudo rm -f /etc/nginx/sites-enabled/default
```

The site config is in step 9, once the code is in place.

---

## 7. Get the code

The GitHub repo is private, so give the server a read-only **deploy key**:

```bash
ssh-keygen -t ed25519 -C "zk-server deploy" -f ~/.ssh/github_deploy -N ""
cat ~/.ssh/github_deploy.pub
```

On GitHub, open the repo's **Settings**, then **Deploy keys**, then **Add deploy key**. Paste the key and leave "Allow write access" **off**.

```bash
cat >> ~/.ssh/config <<'EOF'
Host github.com
  IdentityFile ~/.ssh/github_deploy
  IdentitiesOnly yes
EOF

sudo mkdir -p /var/www/zk-sports
sudo chown akmal:www-data /var/www/zk-sports
git clone git@github.com:akmalkhancreativetech/zk-sports-backend.git /var/www/zk-sports
```

Your user owns the code, and `www-data` (Nginx/PHP-FPM) only needs to write to `storage/` and `bootstrap/cache/`.

---

## 8. Laravel (admin panel and API)

```bash
cd /var/www/zk-sports
cp .env.example .env
nano .env
```

Set these values and leave everything else as it is:

```dotenv
APP_NAME="ZK Sports"
APP_ENV=production
APP_DEBUG=false
APP_URL=https://zk-server.tail1234.ts.net:8443

LOG_LEVEL=error

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=zk_sports
DB_USERNAME=zk_sports
DB_PASSWORD=CHANGE-ME-strong-password

SESSION_DRIVER=database
SESSION_DOMAIN=null
SESSION_SECURE_COOKIE=true

# The public Next.js site
FRONTEND_URL=https://zk-server.tail1234.ts.net
SANCTUM_STATEFUL_DOMAINS=zk-server.tail1234.ts.net

FILESYSTEM_DISK=public

# Nothing in the app is queued yet, so jobs run inline and no worker is needed.
QUEUE_CONNECTION=sync

# Emails (password resets, order notifications) go to the log until SMTP is set up.
MAIL_MAILER=log
MAIL_FROM_ADDRESS="no-reply@example.com"
```

> `APP_URL` **must** include `:8443`. Image URLs sent to the public site are built from it, so a wrong value means broken images.

Install, build and migrate:

```bash
composer install --no-dev --optimize-autoloader --no-interaction
php artisan key:generate --force
php artisan migrate --force
php artisan storage:link

npm ci
npm run build          # builds the admin panel's assets into public/build

php artisan optimize   # caches config, routes, views and events
```

Permissions:

```bash
sudo chown -R akmal:www-data storage bootstrap/cache
sudo chmod -R ug+rwX storage bootstrap/cache
sudo find storage bootstrap/cache -type d -exec chmod g+s {} \;
```

### Create the admin user

Don't run `db:seed` in production. It creates a test user, fake orders, and admin accounts whose password is literally `password`. Create one real admin instead:

```bash
php artisan tinker --execute '
App\Models\User::create([
    "name" => "Your Name",
    "email" => "you@example.com",
    "password" => "CHANGE-ME-strong-password",
    "role" => App\Enums\UserRole::Admin,
]);'
```

(The password is hashed automatically by the model's `hashed` cast.)

---

## 9. Nginx site for Laravel

Laravel only listens on `127.0.0.1:8080`, and Tailscale Funnel forwards public traffic to it. Replace the hostname and check the socket name from step 2:

```bash
sudo tee /etc/nginx/sites-available/zk-sports-api >/dev/null <<'NGINX'
server {
    listen 127.0.0.1:8080 default_server;
    server_name _;

    root /var/www/zk-sports/public;
    index index.php;

    client_max_body_size 25M;

    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";

    charset utf-8;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location = /favicon.ico { access_log off; log_not_found off; }
    location = /robots.txt  { access_log off; log_not_found off; }

    location ~ \.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/run/php/php-fpm.sock;

        # Public traffic only ever reaches this server through Tailscale's TLS
        # on :8443, so tell Laravel the original scheme and host. Without this
        # it builds http://127.0.0.1:8080 links and redirects (e.g. after login).
        fastcgi_param HTTPS on;
        fastcgi_param HTTP_HOST zk-server.tail1234.ts.net:8443;
    }

    location ~ /\.(?!well-known).* {
        deny all;
    }
}
NGINX

sudo ln -s /etc/nginx/sites-available/zk-sports-api /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

curl -I http://127.0.0.1:8080/up        # expect HTTP/1.1 200
curl -s http://127.0.0.1:8080/api/v1/services | head -c 300
```

---

## 10. Next.js public site

`NEXT_PUBLIC_*` values are baked in at **build** time, so create the env file before building:

```bash
cd /var/www/zk-sports/frontend
cat > .env.production.local <<'EOF'
# Server-side calls stay on the machine and skip Tailscale entirely.
API_URL=http://127.0.0.1:8080

# What browsers and image URLs use.
NEXT_PUBLIC_API_URL=https://zk-server.tail1234.ts.net:8443
NEXT_PUBLIC_SITE_URL=https://zk-server.tail1234.ts.net

# The ts.net name resolves to a private 100.x address on this machine, which
# Next's image optimizer refuses by default. See next.config.ts.
IMAGES_ALLOW_LOCAL_IP=true
EOF

npm ci
npm run build
```

Run it as a service:

```bash
sudo tee /etc/systemd/system/zk-sports-web.service >/dev/null <<'UNIT'
[Unit]
Description=ZK Sports public site (Next.js)
After=network.target nginx.service

[Service]
Type=simple
User=akmal
WorkingDirectory=/var/www/zk-sports/frontend
Environment=NODE_ENV=production
ExecStart=/usr/bin/node node_modules/next/dist/bin/next start -H 127.0.0.1 -p 3000
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
UNIT

sudo systemctl daemon-reload
sudo systemctl enable --now zk-sports-web
systemctl status zk-sports-web --no-pager
curl -I http://127.0.0.1:3000           # expect 200
```

---

## 11. Put it on the internet with Tailscale Funnel

```bash
sudo tailscale funnel --bg --https=443  http://127.0.0.1:3000
sudo tailscale funnel --bg --https=8443 http://127.0.0.1:8080
tailscale funnel status
```

The first time you run it, the CLI may print a link asking you to allow Funnel for this machine. Open the link and approve it, which adds the `funnel` attribute to your tailnet policy, then run the commands again.

The configuration survives reboots. To undo it, run `sudo tailscale funnel reset`.

> **Private only instead?** Use `tailscale serve` with the same flags in place of `tailscale funnel`. Only devices signed in to your tailnet can open the URLs then.

---

## 12. Check it works

From any device, or from your own Tailscale devices if you used `serve`:

- [ ] `https://zk-server.tail1234.ts.net` shows the public site.
- [ ] `https://zk-server.tail1234.ts.net/products` lists products, and images load.
- [ ] `https://zk-server.tail1234.ts.net:8443/admin` shows the login page. You can sign in with the admin user from step 8.
- [ ] Uploading a product image in the admin works, and it then shows on the public site. The site caches API responses for about 1–5 minutes, so it can take a moment.
- [ ] Submitting the quote form creates an order in the admin.
- [ ] `https://zk-server.tail1234.ts.net:8443/up` returns 200.

---

## 13. Deploying updates

Push from your PC, then on the server:

```bash
cd /var/www/zk-sports
git pull

# Laravel
composer install --no-dev --optimize-autoloader --no-interaction
php artisan migrate --force
npm ci && npm run build
php artisan optimize
sudo systemctl reload php*-fpm

# Next.js
cd frontend
npm ci && npm run build
sudo systemctl restart zk-sports-web
```

For a few seconds during the Next build and restart, the public site may return errors. For zero downtime you'd build into a separate directory and swap. That isn't worth it at this scale.

If you change `.env`, run `php artisan optimize` again, because config is cached. If you change `frontend/.env.production.local`, rebuild the frontend.

---

## 14. Backups

The database and the uploaded images (`storage/app/public`) are the only things that can't be recreated from git.

```bash
sudo mkdir -p /var/backups/zk-sports && sudo chown akmal /var/backups/zk-sports
nano ~/.my.cnf
```

```ini
[mysqldump]
user=zk_sports
password=CHANGE-ME-strong-password
```

```bash
chmod 600 ~/.my.cnf
crontab -e
```

```cron
# 02:30 daily: database and uploads, keep 14 days
30 2 * * * mysqldump --single-transaction zk_sports | gzip > /var/backups/zk-sports/db-$(date +\%F).sql.gz
35 2 * * * tar -czf /var/backups/zk-sports/uploads-$(date +\%F).tar.gz -C /var/www/zk-sports/storage/app public
40 2 * * * find /var/backups/zk-sports -type f -mtime +14 -delete
```

Copy these off the machine now and then. A backup on the same disk doesn't protect you if the disk fails.

---

## 15. Troubleshooting

| Symptom | Check |
| --- | --- |
| Any 500 from the admin or API | `tail -n 50 /var/www/zk-sports/storage/logs/laravel.log` |
| 502 Bad Gateway on `:8443` | `systemctl status php*-fpm`, and that the socket in the Nginx config exists (`ls /run/php`) |
| Public site down | `journalctl -u zk-sports-web -n 100 --no-pager` |
| Images broken on the public site | `APP_URL` has `:8443`; `php artisan storage:link` was run; `IMAGES_ALLOW_LOCAL_IP=true` was set **before** `npm run build` |
| After login you're sent to `127.0.0.1` | The `fastcgi_param HTTP_HOST` line in the Nginx config is wrong or missing |
| "Permission denied" writing logs or uploads | Repeat the permissions block in step 8 |
| Upload fails for large images | `upload_max_filesize` / `post_max_size` (step 2) and `client_max_body_size` (step 9) |
| Changes to `.env` ignored | `php artisan optimize` (config is cached) |
| URL not reachable at all | `tailscale funnel status`; MagicDNS and HTTPS certificates enabled in the admin console |

### Known limitation: API rate limit

`/api/v1` is limited to 60 requests per minute per IP address. Every request from the public site reaches Laravel from the Next.js server, so all visitors share that one budget. Caching keeps this low for now. If the site gets busy, raise the limit in `AppServiceProvider` or skip throttling for requests from `127.0.0.1`.
