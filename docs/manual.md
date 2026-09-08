# manual.md — Manual Installation (run these yourself)

**Path chosen:** bare Laravel 13 via `composer create-project`, then Inertia + React + TypeScript layered on by hand. No `laravel new`, no starter kit, no Wayfinder.

Target: `~/zk-sports` on WSL2 Ubuntu, MySQL 8.

Run in order. Stop at the first failure.

---

## 0. Environment verdict

| Tool | You have | Needed | Status |
|---|---|---|---|
| PHP | 8.4 | **8.3+** (Laravel 13 dropped 8.2) | ✅ |
| Composer | **2.2.6 (2022-02-04)** | 2.7+ | ❌ **upgrade first** |
| Node | 24.19.0 | 20+ | ✅ |
| npm | 11.17.0 | 10+ | ✅ |
| MySQL | 8.0.41 | 8.0+ | ✅ |
| Laravel installer | 5.12.2 | — | not used on this path |

---

## 0b. What you're trading away

Read this once, then decide, then don't revisit it.

The React starter kit ships roughly 40 files you are now going to write yourself:

| Starter kit gives you | Manual path |
|---|---|
| Login, register, forgot/reset password, email verification | Section 9 — you build the pages |
| Two-factor auth (TOTP, recovery codes, challenge screen) | Section 9 — you build the pages |
| Settings: profile, password, appearance, 2FA | You build them |
| App shell: sidebar layout, header layout, nav, breadcrumbs, user menu | You build them |
| ~35 pre-wired shadcn/ui components | `npx shadcn add` one at a time |
| Dark mode toggle + persistence | You build it |
| Pest tests for the whole auth surface | You write them |

Realistic cost: **2–3 days** before you write a single line of Sliders code. The alternative — install the starter kit and delete Wayfinder — is about **2 hours** and lands you in the same place minus the generated route files.

If the reason for going manual is "I want to understand every layer," this is a legitimate investment and Sections 5–9 are your curriculum. If the reason is only "I don't want Wayfinder," you're paying two to three days to avoid a two-hour deletion. Your call — the rest of this document assumes you've made it.

---

## 1. Upgrade Composer

```bash
composer self-update --2
composer -V          # expect 2.8.x or newer
```

Permissions error:

```bash
sudo -H composer self-update --2
```

Distro-packaged Composer with `self-update` disabled:

```bash
sudo apt remove composer -y
php -r "copy('https://getcomposer.org/installer', 'composer-setup.php');"
php composer-setup.php --install-dir=/usr/local/bin --filename=composer
rm composer-setup.php
composer -V
```

---

## 2. PHP extensions

```bash
php -m | grep -Ei '^(pdo_mysql|mbstring|openssl|tokenizer|xml|ctype|json|bcmath|fileinfo|curl|zip|gd|intl)$'
```

Install anything missing:

```bash
sudo apt update
sudo apt install -y php8.4-mysql php8.4-mbstring php8.4-xml php8.4-bcmath \
  php8.4-curl php8.4-zip php8.4-gd php8.4-intl
php -m | grep pdo_mysql
```

---

## 3. MySQL

Running 8.0.41 already. WSL2 doesn't auto-start services:

```bash
sudo service mysql status || sudo service mysql start
```

```bash
sudo mysql -u root
```

```sql
CREATE DATABASE zk_sports
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE USER 'zk_sports'@'localhost' IDENTIFIED BY 'CHANGE_ME_STRONG_PASSWORD';
GRANT ALL PRIVILEGES ON zk_sports.* TO 'zk_sports'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

`utf8mb4_unicode_ci` is deliberate — MySQL 8 defaults to `utf8mb4_0900_ai_ci`, and a mismatch between dev and production produces `Illegal mix of collations` on joins.

```bash
mysql -u zk_sports -p zk_sports -e "SELECT DATABASE(), @@version, @@collation_database;"
```

---

## 4. Install bare Laravel 13

```bash
cd ~
rm -rf zk-sports
composer create-project laravel/laravel:^13.0 zk-sports --prefer-dist
cd zk-sports
php artisan --version        # expect 13.x
```

If `^13.0` won't resolve, check what's actually available:

```bash
composer show laravel/laravel --all | head -40
```

Confirm what the skeleton already includes — Laravel 13 ships Vite and Tailwind 4 out of the box, which changes what you install in Sections 6–7:

```bash
cat package.json
ls resources/js resources/css
cat vite.config.*
```

---

## 5. Environment

```bash
nano .env
```

```env
APP_NAME="ZK Sports"
APP_ENV=local
APP_DEBUG=true
APP_URL=http://localhost:8000
APP_TIMEZONE=UTC

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=zk_sports
DB_USERNAME=zk_sports
DB_PASSWORD=CHANGE_ME_STRONG_PASSWORD

FILESYSTEM_DISK=public
QUEUE_CONNECTION=database
CACHE_STORE=database
SESSION_DRIVER=database

MAIL_MAILER=log
MAIL_FROM_ADDRESS="noreply@zksports.test"
MAIL_FROM_NAME="${APP_NAME}"
```

`127.0.0.1`, not `localhost` — the latter makes PHP try a unix socket, which is flaky under WSL2.

Keep the database in UTC and convert at the display layer. Setting `APP_TIMEZONE=Asia/Karachi` breaks scheduled post publishing in subtle ways.

Pin the collation in `config/database.php` under `'mysql'`:

```php
'charset'   => 'utf8mb4',
'collation' => 'utf8mb4_unicode_ci',
```

Then:

```bash
php artisan key:generate
php artisan migrate
php artisan storage:link
```

`migrate` succeeding is your MySQL connection test. Commit here.

```bash
git init && git add -A && git commit -m "bare laravel 13 + mysql"
```

---

## 6. Inertia — server side

```bash
composer require inertiajs/inertia-laravel
composer show inertiajs/inertia-laravel | grep versions    # note the major version
php artisan inertia:middleware
```

### 6.1 Register the middleware

`bootstrap/app.php`:

```php
use Illuminate\Foundation\Configuration\Middleware;

->withMiddleware(function (Middleware $middleware): void {
    $middleware->web(append: [
        \App\Http\Middleware\HandleInertiaRequests::class,
        \Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets::class,
    ]);
})
```

### 6.2 Root view

Create `resources/views/app.blade.php`:

```blade
<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" class="h-full">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title inertia>{{ config('app.name') }}</title>
    @viteReactRefresh
    @vite(['resources/css/app.css', 'resources/js/app.tsx'])
    @inertiaHead
</head>
<body class="h-full font-sans antialiased">
    @inertia
</body>
</html>
```

`@viteReactRefresh` **must** come before `@vite`, or HMR silently fails.

Delete the default `resources/views/welcome.blade.php` once Section 8 renders.

### 6.3 Test route

`routes/web.php`:

```php
use Inertia\Inertia;

Route::get('/', fn () => Inertia::render('welcome', ['name' => 'ZK Sports']));
```

---

## 7. React + TypeScript — client side

### 7.1 Packages

```bash
npm install @inertiajs/react react react-dom
npm install -D @vitejs/plugin-react typescript @types/react @types/react-dom @types/node
```

`@types/node` is not optional. `vite.config.ts` is type-checked like any other file, and without it TypeScript can't resolve `node:path` or `import.meta.dirname`.

Tailwind 4 — check `package.json` first; skip if the skeleton already has it:

```bash
npm install -D tailwindcss @tailwindcss/vite
```

### 7.2 Vite config

```bash
git mv vite.config.js vite.config.ts 2>/dev/null || mv vite.config.js vite.config.ts
```

Replace the contents:

```ts
import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

export default defineConfig({
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.tsx'],
            refresh: true,
        }),
        react(),
        tailwindcss(),
    ],
    resolve: {
        alias: {
            '@': path.resolve(import.meta.dirname, 'resources/js'),
        },
    },
    server: {
        host: '0.0.0.0',
        hmr: { host: 'localhost' },
    },
});
```

Three things here are version-specific:

- **`import.meta.dirname`, not `__dirname`.** Vite 8 warns that `__dirname` is unsupported under the native config loader, which becomes the default in a future major. `import.meta.dirname` needs Node 20.11+ — you're on 24.
- **`node:path` and `import.meta.dirname` both require `@types/node`** *and* `"node"` in the tsconfig `types` array (§7.3). Miss either and you get `Cannot find name 'node:path'`.
- **The `server` block is a WSL2 concession.** Without it the browser on Windows can't reach the HMR websocket.

#### Alternative: skip Node types entirely

Vite resolves a leading `/` against the project root, so the alias works with no imports at all:

```ts
import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.tsx'],
            refresh: true,
        }),
        react(),
        tailwindcss(),
    ],
    resolve: {
        alias: { '@': '/resources/js' },
    },
    server: {
        host: '0.0.0.0',
        hmr: { host: 'localhost' },
    },
});
```

This is what Laravel's own Breeze and Jetstream Vite configs used for years, so it's well-trodden. Still install `@types/node` — you'll want it the first time you write a build or seed script — but this removes the config file's dependency on it.

### 7.3 tsconfig.json

```json
{
    "compilerOptions": {
        "target": "ESNext",
        "lib": ["DOM", "DOM.Iterable", "ESNext"],
        "module": "ESNext",
        "moduleResolution": "bundler",
        "jsx": "react-jsx",
        "strict": true,
        "noEmit": true,
        "esModuleInterop": true,
        "skipLibCheck": true,
        "allowJs": true,
        "isolatedModules": true,
        "resolveJsonModule": true,
        "forceConsistentCasingInFileNames": true,
        "types": ["vite/client", "node"],
        "paths": {
            "@/*": ["./resources/js/*"]
        }
    },
    "include": ["resources/js/**/*.ts", "resources/js/**/*.tsx", "resources/js/**/*.d.ts"]
}
```

`"node"` in `types` is what makes `node:path` and `import.meta.dirname` resolve in `vite.config.ts`. Adding `@types/node` to `package.json` alone is not enough once you've set an explicit `types` array — the array is a whitelist, and anything omitted is invisible.

**No `baseUrl`, and `paths` values must be relative.** TypeScript 6 removed `baseUrl` outright (`error TS5102`) and rejects non-relative path targets (`error TS5090`). Most Laravel + Inertia tutorials predate this and will show you `"baseUrl": "."` with `"resources/js/*"` — both now fail. The leading `./` is required.

The `@/*` target must still match the Vite alias. Mismatch = TypeScript resolves imports that Vite then can't bundle.

### 7.4 Tailwind entry

`resources/css/app.css` — first line:

```css
@import "tailwindcss";
```

Tailwind 4 has no `tailwind.config.js`. Configure through CSS.

### 7.5 Inertia entry point

```bash
rm -f resources/js/app.js
mkdir -p resources/js/pages resources/js/layouts resources/js/components resources/js/lib resources/js/types
```

`resources/js/app.tsx`:

```tsx
import '../css/app.css';

import { createInertiaApp } from '@inertiajs/react';
import type { ComponentType } from 'react';
import { createRoot } from 'react-dom/client';

const appName = import.meta.env.VITE_APP_NAME || 'ZK Sports';

const pages = import.meta.glob<{ default: ComponentType<any> }>('./pages/**/*.tsx');

createInertiaApp({
    title: (title) => (title ? `${title} — ${appName}` : appName),

    resolve: async (name) => {
        const page = pages[`./pages/${name}.tsx`];

        if (!page) {
            throw new Error(`Inertia page not found: ./pages/${name}.tsx`);
        }

        return (await page()).default;
    },

    setup({ el, App, props }) {
        if (!el) {
            throw new Error('Inertia root element not found — is @inertia in app.blade.php?');
        }

        createRoot(el).render(<App {...props} />);
    },

    progress: { color: '#ef4444' },
});
```

Three things here differ from almost every Laravel + Inertia tutorial you'll find, because current `@inertiajs/react` types are stricter than the ones those were written against:

- **The resolver returns the component, not the module.** `resolvePageComponent()` from `laravel-vite-plugin/inertia-helpers` resolves to `{ default: Component }`, and the current `ComponentResolver` type doesn't accept a promise of a module — only `ReactComponent`, `Promise<ReactComponent>`, or a plain `{ default }` object. It works at runtime, which is why the pattern spread, but it fails `tsc`. Awaiting the import and returning `.default` yourself is both correct and one less dependency.
- **`el` is `HTMLElement | null`.** The null check is mandatory under `strict`. It also gives you a real error message instead of a blank page when the `@inertia` directive is missing.
- **`ComponentType<any>` is deliberate.** The glob's generic has to be loose enough to accept every page's props shape. Narrowing it here buys nothing — page props are typed at the page component, which is where it matters.

Lowercase `pages/` directory. Pick a casing convention now and never mix — WSL2's filesystem is case-sensitive but Windows tooling is not, so `Pages/dashboard` vs `pages/Dashboard` breaks only on deploy.

`resources/js/pages/welcome.tsx`:

```tsx
import { Head } from '@inertiajs/react';

export default function Welcome({ name }: { name: string }) {
    return (
        <>
            <Head title="Welcome" />
            <div className="flex min-h-screen items-center justify-center">
                <h1 className="text-3xl font-semibold">{name} is running.</h1>
            </div>
        </>
    );
}
```

### 7.6 Type definitions

`resources/js/types/inertia.d.ts`:

```ts
import type { Page, PageProps as InertiaPageProps } from '@inertiajs/core';

export interface Auth {
    user: { id: number; name: string; email: string; role: string } | null;
}

export interface SharedProps extends InertiaPageProps {
    auth: Auth;
    flash: { success?: string; error?: string };
    newOrdersCount: number;
}

declare module '@inertiajs/core' {
    interface PageProps extends SharedProps {}
}
```

### 7.7 Run it

```bash
npm run build
npx tsc --noEmit
php artisan serve
# second terminal:
npm run dev
```

<http://localhost:8000> should show "ZK Sports is running." Commit.

```bash
git add -A && git commit -m "inertia + react + typescript"
```

---

## 8. shadcn/ui

```bash
npx shadcn@latest init
```

### 8.1 The component-library prompt

shadcn 4.x asks first:

```
? Select a component library
❯   Base UI (Recommended)
    React Aria
    Radix UI
```

**Choose Base UI.**

| | Base UI | Radix UI | React Aria |
|---|---|---|---|
| Maintainer | MUI team — including several original Radix engineers | WorkOS | Adobe |
| Status | v1.0 stable since Dec 2025, ~35 components | Mature, 30+ components, huge install base | Added to shadcn July 2026 |
| shadcn default | ✅ | legacy | opt-in (`--base aria`) |
| Best for | new projects on current shadcn | pasting in community components written for Radix | heavy i18n — 30+ languages, 13 calendar systems |

The reasoning: shadcn's own components are rebuilt for Base UI with the **same API**, so your `<Dialog>`, `<Select>`, `<Popover>` usage looks identical either way. What differs is which package is maintained going forward, and that's Base UI — the people who built Radix are now building it.

**When Radix would be the right call instead:** you plan to paste in a lot of third-party shadcn blocks or community components. Most of those were written pre-2026 and import `@radix-ui/react-*` directly. Mixing primitives in one project isn't fatal but it doubles your dependency surface for no benefit.

**When React Aria would be:** you need serious internationalisation. Not this project.

For the four modules here — sliders, services, blog, orders — the primitive choice is close to invisible. Don't spend more than the thirty seconds you already have on it.

### 8.2 Remaining answers

TypeScript **yes** · style your pick · base color your pick · CSS file `resources/css/app.css` · CSS variables **yes** · components alias `@/components` · utils alias `@/lib/utils`.

It writes `components.json` and `resources/js/lib/utils.ts`, and installs `clsx`, `tailwind-merge`, `class-variance-authority`, `lucide-react`, plus the Base UI packages.

Verify the aliases landed correctly — shadcn writes paths based on `components.json`, and a mismatch with §7.2/§7.3 puts components somewhere Vite can't resolve:

```bash
cat components.json
ls resources/js/lib/utils.ts
```

### 8.3 Add the components the admin panel needs

```bash
npx shadcn@latest add button input label card table dialog sheet tabs badge \
    select textarea switch dropdown-menu popover calendar command sonner \
    alert-dialog separator avatar skeleton
```

```bash
npx tsc --noEmit && npm run build
git add -A && git commit -m "shadcn/ui on base ui"
```

Run `tsc` before committing. Generated components are the most likely place for another version-drift error like the ones in §7.

---

## 9. Authentication (Fortify)

This is the part the starter kit would have handed you. Fortify supplies the backend; you write the Inertia pages.

```bash
composer require laravel/fortify
php artisan fortify:install
php artisan migrate
```

### 9.1 Point Fortify at Inertia pages

`app/Providers/FortifyServiceProvider.php`, inside `boot()`:

```php
use Inertia\Inertia;
use Laravel\Fortify\Fortify;

Fortify::loginView(fn () => Inertia::render('auth/login'));
Fortify::registerView(fn () => Inertia::render('auth/register'));
Fortify::requestPasswordResetLinkView(fn () => Inertia::render('auth/forgot-password'));
Fortify::resetPasswordView(fn ($request) => Inertia::render('auth/reset-password', [
    'email' => $request->email,
    'token' => $request->route('token'),
]));
Fortify::verifyEmailView(fn () => Inertia::render('auth/verify-email'));
Fortify::confirmPasswordView(fn () => Inertia::render('auth/confirm-password'));
Fortify::twoFactorChallengeView(fn () => Inertia::render('auth/two-factor-challenge'));
```

### 9.2 Trim what you don't need

`config/fortify.php` — comment out features you won't use. Public registration on a marketing-site admin panel is almost certainly wrong:

```php
'features' => [
    // Features::registration(),
    Features::resetPasswords(),
    Features::emailVerification(),
    Features::twoFactorAuthentication(['confirm' => true, 'confirmPassword' => true]),
],
```

Seed the first admin instead:

```bash
php artisan make:seeder AdminUserSeeder
# then: php artisan db:seed --class=AdminUserSeeder
```

### 9.3 Pages to write

`resources/js/pages/auth/`: `login.tsx`, `forgot-password.tsx`, `reset-password.tsx`, `verify-email.tsx`, `confirm-password.tsx`, `two-factor-challenge.tsx`.

Each posts to a fixed Fortify URL — `/login`, `/forgot-password`, `/reset-password`, `/two-factor-challenge`. Confirm the full list:

```bash
php artisan route:list --except-vendor=false | grep -Ei 'login|password|two-factor|verif'
```

### 9.4 Rate limiting

Fortify's install stubs this, but verify it exists in `FortifyServiceProvider`:

```php
RateLimiter::for('login', fn ($request) =>
    Limit::perMinute(5)->by($request->email . $request->ip()));
```

An admin login with no rate limit is a credential-stuffing target from day one.

```bash
php artisan test && git add -A && git commit -m "fortify auth"
```

---

## 10. Routing layer

No Wayfinder. No Ziggy either — on a manual build there's nothing forcing one in, so don't add one.

`resources/js/lib/routes.ts` is the single source of URLs. Shape is specified in `plan.md` §2.2.

Add the guardrail immediately, not later:

```bash
php artisan make:test RouteMapTest --pest
```

The test parses `routes.ts` and asserts every literal path resolves against `Route::getRoutes()`. Without it the map drifts silently and you find out in production. This test is the entire reason a manual route map is viable at all.

---

## 11. Remaining packages

Install per phase, not upfront.

```bash
# Phase 0 — admin shell
npm install @tanstack/react-table @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities

# Phase 0 — media (decide first: plan.md §3.4)
composer require spatie/laravel-medialibrary
php artisan vendor:publish --provider="Spatie\MediaLibrary\MediaLibraryServiceProvider" --tag="medialibrary-migrations"
php artisan migrate

# Phase 3 — blog editor
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-link @tiptap/extension-image

# Phase 5 — quote PDF, exports
composer require barryvdh/laravel-dompdf
composer require maatwebsite/excel
```

Optional, recommended:

```bash
composer require laravel/boost --dev && php artisan boost:install
composer require laravel/pail --dev
composer require pestphp/pest --dev --with-all-dependencies
```

Bare `laravel/laravel` has no `composer run dev` script. Add one to `composer.json`:

```json
"scripts": {
    "dev": [
        "Composer\\Config::disableProcessTimeout",
        "npx concurrently -c '#93c5fd,#c4b5fd,#fb7185' \"php artisan serve\" \"php artisan queue:listen --tries=1\" \"npm run dev\" --names=server,queue,vite"
    ]
}
```

```bash
npm install -D concurrently
composer run dev
```

---

## 12. MySQL conventions for this build

1. **No `enum` columns.** `string(20)` + PHP enum cast. `ALTER TABLE … MODIFY ENUM` rewrites and locks the table.
2. **Lowercase slugs on write.** `utf8mb4_unicode_ci` treats `Cricket-Kits` and `cricket-kits` as equal at the unique index but *not* in a PHP `array_key_exists()` or `firstWhere()` comparison. Normalise in a mutator.
3. **`decimal(12,2)` for money.** Never `FLOAT`/`DOUBLE`.
4. **JSON columns** are fine for `order_items.options`; never for anything you filter or sort at scale.
5. **`FULLTEXT(title, excerpt, content)` on `posts`.** `LIKE '%term%'` can't use an index.
6. **No sequences.** Order numbers need a `counters` table with `lockForUpdate()` inside the transaction, plus a unique index as backstop.
7. **InnoDB index cap is 3072 bytes**; utf8mb4 is 4 bytes/char, so ~768 chars. Two `varchar(255)` columns in a composite unique is fine, three is not.

---

## 13. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `Your requirements could not be resolved` | Composer 2.2 | §1 |
| `could not find driver` | `pdo_mysql` missing | §2 |
| `SQLSTATE[HY000] [2002] No such file or directory` | `DB_HOST=localhost` | Use `127.0.0.1` |
| `Illegal mix of collations` | Table on `utf8mb4_0900_ai_ci` | Pin collation before first migration |
| Blank page, console `Cannot read properties of undefined` | `@inertia` missing from `app.blade.php` | §6.2 |
| `Unable to locate file in Vite manifest` | Wrong `input` paths in `vite.config.ts` | §7.2 |
| React not hot-reloading | `@viteReactRefresh` after `@vite` | Must come **before** |
| HMR websocket never connects | WSL2 network isolation | `server` block in §7.2 |
| `Cannot find module '@/…'` | tsconfig `paths` ≠ Vite alias | §7.2 / §7.3 |
| `TS5102: Option 'baseUrl' has been removed` | TypeScript 6 | Delete `baseUrl` from tsconfig — §7.3 |
| `TS5090: Non-relative paths are not allowed` | TypeScript 6 | `"@/*": ["./resources/js/*"]` with leading `./` — §7.3 |
| Vite warns `__dirname` unsupported by `configLoader: 'native'` | Vite 8 | Use `import.meta.dirname` — §7.2 |
| `Cannot find name 'node:path'` / `import.meta.dirname` untyped | `@types/node` missing, or `"node"` absent from tsconfig `types` | `npm i -D @types/node` **and** `"types": ["vite/client", "node"]` — §7.1 / §7.3 |
| `TS2769` on `resolve:` — `Promise<ReactComponent>` not assignable to `ReactComponent` | `resolvePageComponent` returns the module, not the component | Await the glob import and return `.default` — §7.5 |
| `TS2769` on `setup:` — `null` not assignable to `HTMLElement` | Current Inertia types allow a null root element | Guard `if (!el) throw …` — §7.5 |
| Page resolves locally, 404 on server | `pages/` casing mismatch | Lowercase everywhere |
| `Class HandleInertiaRequests not found` | Middleware not registered | §6.1 |
| Fortify routes 404 | `fortify:install` not run, or provider unregistered | §9 |

---

## 14. Done-check

Before Phase 0 in `plan.md`:

- [ ] `composer -V` ≥ 2.8
- [ ] `php artisan --version` shows **13.x**
- [ ] `php -m | grep pdo_mysql` prints
- [ ] `mysql -u zk_sports -p zk_sports -e "SELECT @@collation_database;"` → `utf8mb4_unicode_ci`
- [ ] `php artisan migrate:status` lists migrations
- [ ] `composer show | grep -E 'wayfinder|ziggy'` returns **nothing**
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
- [ ] `php artisan test` green
- [ ] `/` renders the Inertia welcome page
- [ ] Login → dashboard → logout works
- [ ] `resources/js/lib/routes.ts` exists **and** its parity test passes
- [ ] Everything committed