# Public Site — Next.js Frontend Plan

Public marketing site for **zk-sports** as a **Next.js 16 (App Router) + TypeScript + Tailwind 4** application living in `frontend/` **inside this repository**, consuming a versioned JSON API served by the existing Laravel 13 backend. Authentication for public users via **Laravel Sanctum, SPA cookie mode**.

> The admin panel stays exactly as it is: Laravel + Inertia 3 + React, Fortify session auth, routes in `routes/admin.php`. Nothing in this plan touches it. See `plan.md` for the admin build.

---

## 1. Decisions already made

Read once, then don't revisit.

| Question | Decision | Why |
|---|---|---|
| Where does the Next app live? | `frontend/` in this repo, one git history | One PR spans an API change and its consumer; no cross-repo version skew on the shared types |
| API shape | `routes/api.php`, prefix `api/v1`, Eloquent API Resources | Matches the `--api` convention in the Boost guidelines; versioning from day one is free, retrofitting it is not |
| Auth mechanism | **Sanctum SPA (cookie/session)**, not API tokens | Requested. Also: no token to leak into `localStorage`, and it reuses the session guard Fortify already drives |
| Who issues login/register? | **Fortify**, with `registration` + `emailVerification` features enabled | `bootstrap/app.php` already forces JSON responses for `api/*` and `expectsJson()` requests |
| Admin vs customer accounts | One `users` table, `role` gains a `Customer` case | `can:access-admin` already gates the panel; a `Customer` never passes it. Orders already carry `user_id` |
| Rendering strategy | RSC/SSG for public content, client components for anything authenticated | Public content has no cookie dependency, so it caches. Authenticated views need the browser's cookie — see §6.2 |

### 1.1 One repo, two build systems

`frontend/` must stay invisible to the Laravel toolchain, and vice versa. Concretely:

| Tool | Status |
|---|---|
| Pint | ✅ None — PHP only, and there is no PHP under `frontend/` |
| Laravel Vite (`vite.config.ts`) | ✅ None — `input` and `server.warmup.clientFiles` are explicit `resources/` paths, so Vite never walks `frontend/` |
| Root `tsconfig.json` | ✅ None — `include` is an allow-list (`resources/js/**/*`), which already excludes `frontend/`. An explicit `"exclude"` would be dead config |
| Pest / PHPUnit | ✅ None — `phpunit.xml` scopes to `tests/` |
| `.gitignore` | ✅ **Done** — added `/frontend/.env.local`, `/frontend/.next`, `/frontend/node_modules`. Root `/node_modules` is anchored and does not cover the nested one |
| `composer run dev` | Leave it alone. Next runs as its own process (§8) |

`create-next-app` will also write its own `frontend/.gitignore`; the root entries above are deliberate belt-and-braces so a stray `node_modules` can't be staged before that file exists.

Two `node_modules` trees and two lockfiles is the intended state — do not try to merge them into one workspace.

### 1.2 The one hard constraint

Sanctum SPA mode is **cookie-based**, so the Next app and Laravel must be **same-site**:

| Environment | Next.js | Laravel | `SESSION_DOMAIN` |
|---|---|---|---|
| Dev | `localhost:3000` | `localhost:8000` | `null` (host-only) |
| Production | `zk-sports.com` | `api.zk-sports.com` | `.zk-sports.com` |

**Confirmed 2026-09-10:** production is `zk-sports.com` + `api.zk-sports.com`, so the cookie plan holds as written and Sanctum tokens are not needed. Dev works because cookies ignore port. Had the frontend gone to a different apex domain (Vercel's `*.vercel.app`, say), cookie auth would have been dead and Phase 3 would have had to switch to tokens — so if that hosting decision ever changes, this is the section to revisit first.

---

## 2. Phases and checkpoints

Each phase ends with something verifiable. Stop at the first failure.

| Phase | Delivers | Checkpoint |
|---|---|---|
| 0 ✅ | API scaffolding installed | **Done 2026-09-10** — `tests/Feature/ApiHealthTest.php` green (4 passed) |
| 1 ✅ | Public read-only endpoints (sliders, services, blog) | **Done 2026-09-10** — 28 tests green across `ApiHealthTest`, `PublicServiceApiTest`, `PublicBlogApiTest`, `PublicSliderApiTest` |
| 2 ✅ | `frontend/` renders real backend data | **Done 2026-09-10** — Next 16.3.4 + Zod 4.6.1 installed, `tsc --noEmit` clean, home page wired to `sliders/home_hero` and `services?featured=1`. Visual check is Akmal's |
| 3 | Sanctum SPA auth: login, register, logout, `/me` | Pest tests green for the full auth surface |
| 4 | Next.js auth UI + protected account area | Log in from `:3000`, reload, still signed in |
| 5 | Customer orders (create + list own) | A customer creates an order; it appears in the admin panel |

---

## 3. Phase 0 — API scaffolding

```bash
cd ~/zk-sports
php artisan install:api          # creates routes/api.php, installs sanctum, publishes personal_access_tokens migration
php artisan migrate
php artisan config:publish cors
```

`install:api` registers `api: __DIR__.'/../routes/api.php'` in `bootstrap/app.php` — confirm it landed inside `withRouting()`.

### 3.1 Sanctum stateful middleware

Laravel 11+ has no `EnsureFrontendRequestsAreStateful` in the `api` group by default. Add it in `bootstrap/app.php`:

```php
$middleware->statefulApi();
```

This makes `api/*` requests from a configured stateful domain authenticate via the session cookie instead of a bearer token.

### 3.2 `config/cors.php`

```php
'paths' => ['api/*', 'sanctum/csrf-cookie', 'login', 'logout', 'register',
            'forgot-password', 'reset-password', 'user/profile-information', 'user/password'],
'allowed_methods' => ['*'],
'allowed_origins' => [env('FRONTEND_URL', 'http://localhost:3000')],
'allowed_headers' => ['*'],
'supports_credentials' => true,   // non-negotiable for cookie auth
```

`allowed_origins` **must not be `*`** when `supports_credentials` is true — the browser rejects the response.

### 3.3 `.env` additions

```dotenv
FRONTEND_URL=http://localhost:3000
SANCTUM_STATEFUL_DOMAINS=localhost:3000,127.0.0.1:3000
SESSION_DOMAIN=null          # dev only — see below
SESSION_SAME_SITE=lax
```

`SESSION_SAME_SITE=lax` is sufficient because both apps are same-site. Never reach for `none` here — that would mean the same-site premise is broken and you should be using tokens instead.

**`SESSION_DOMAIN` stays `null` in dev.** An earlier draft of this plan said `localhost`; that is wrong on this machine. Naming the host scopes the cookie to it, which breaks the admin panel session at `127.0.0.1:8000` (the current `APP_URL`). Host-only is correct in dev because `localhost:3000` and `localhost:8000` share a host and cookies ignore ports.

Production is the case that genuinely needs it:

```dotenv
SESSION_DOMAIN=.zk-sports.com
```

Not for the session cookie — that would be sent to `api.zk-sports.com` host-only anyway — but so that **JS served from `zk-sports.com` can read the `XSRF-TOKEN` cookie that `api.zk-sports.com` sets**. A host-only cookie on the API subdomain is invisible to the frontend's JavaScript, and §6.3's handshake needs to read it.

Practical consequence in dev: browse the Next site at `http://localhost:3000` and point `NEXT_PUBLIC_API_URL` at `http://localhost:8000`. Substituting `127.0.0.1` on either side puts the two in separate cookie jars and the CSRF token becomes unreadable.

### 3.4 Health route

`routes/api.php`:

```php
Route::prefix('v1')->name('api.v1.')->group(function () {
    Route::get('health', fn () => ['ok' => true])->name('health');
});
```

**Checkpoint:** `php artisan route:list --path=api` shows `api/v1/health`.

---

## 4. Phase 1 — Public read-only endpoints

No auth. These are the endpoints the marketing site renders.

| Method | Path | Returns |
|---|---|---|
| GET | `api/v1/sliders/{key}` | Slider by key (e.g. `home_hero`) with ordered active slides. **No `data` envelope** — returns `PublicSliders::forKey()` as-is |
| GET | `api/v1/service-categories` | Active categories, **flat** — the table has no `parent_id`, so an earlier draft's "nested" was wrong |
| GET | `api/v1/services` | Paginated active services; `?category=`, `?search=` |
| GET | `api/v1/services/{service:slug}` | One service with images, options, price tiers |
| GET | `api/v1/posts` | Paginated published posts; `?category=`, `?tag=` |
| GET | `api/v1/posts/{post:slug}` | One published post with SEO fields, category, tags |
| GET | `api/v1/blog-categories` | Categories with published-post counts |
| GET | `api/v1/blog-tags` | Tags with published-post counts |

### 4.1 Generate

```bash
cd ~/zk-sports
for c in Slider ServiceCategory Service BlogPost BlogCategory BlogTag; do
  php artisan make:controller "Api/V1/${c}Controller" --no-interaction
done
for r in Slider Slide ServiceCategory Service ServiceImage ServiceOption ServicePriceTier \
         BlogPost BlogCategory BlogTag; do
  php artisan make:resource "Api/V1/${r}Resource" --no-interaction
done
```

### 4.2 Rules for these controllers

- **Read-only.** `index` and `show` only. No `store`/`update`/`destroy` on the public surface.
- **Reuse existing query scopes.** `App\Services\PublicSliders` already resolves the active slider for `welcome.tsx` — the slider endpoint calls it rather than re-implementing the query.
- **Filter by visibility in the query, never in the Resource.** Draft posts and inactive services must not reach the serializer at all.
- **Eager-load explicitly** on every endpoint that nests relations; an N+1 here is a public-facing latency bug.
- **Resources own the field allow-list.** Never `return $model` — internal columns (`internal_note`, `assigned_to`, soft-delete timestamps) must be structurally unable to leak.
- **Rate limit** the group with `throttle:api`.

### 4.4 What shipped differently

- **No `SliderResource` / `SlideResource`.** `App\Services\PublicSliders::forKey()` already returns the exact public payload — cached, active-only, live slides in order — and the Inertia welcome page renders it. A Resource would have been a second definition of the same shape, free to drift. The endpoint returns it unwrapped, so **the slider response has no `data` key** while every other endpoint does.
- **The `api` rate limiter had to be defined.** Laravel 11 dropped the `RouteServiceProvider` that used to register it, so `throttle:api` would have thrown `Rate limiter [api] is not defined`. Registered in `AppServiceProvider` at 60/min, keyed by user id then IP.
- **`description` and `body` are detail-only**, via `$this->when($request->routeIs(...))`. `excerpt` is what a list renders; shipping long-form HTML per row would dwarf the rest of a paginated payload.
- **Service option values are shaped inline** in `ServiceOptionResource` rather than getting their own file — three fields, reachable only through an option.
- **`ServiceController@show` / `BlogPostController@show` resolve by explicit query, not route-model binding**, so `active()` / `live()` are part of the lookup. An inactive service is a 404 rather than a record fetched and then rejected.
- **Blog tags with no live posts are dropped**, not returned with a zero count — the list renders as filter chips and a chip leading nowhere is a dead end.

### 4.3 Tests

```bash
php artisan make:test --pest PublicServiceApiTest
php artisan make:test --pest PublicBlogApiTest
php artisan make:test --pest PublicSliderApiTest
```

Each must cover: the happy path shape, and the important failure mode — **that unpublished/inactive/soft-deleted records are absent, and internal fields are absent from the payload.** Use the existing factories and their states.

```bash
vendor/bin/pest --filter=PublicServiceApi
vendor/bin/pint --dirty --format agent
```

---

## 5. Phase 2 — The `frontend/` app

`create-next-app` into the existing repo. It will detect the surrounding git repo and skip `git init` — that is what we want; do **not** let it create a nested repo.

```bash
cd ~/zk-sports
npx create-next-app@16 frontend \
  --typescript --tailwind --eslint --app --src-dir \
  --import-alias "@/*" --use-npm
```

Pin to `@16` rather than `@latest` so a 17 release mid-project doesn't scaffold something this plan doesn't describe. Confirm what you actually got before continuing:

```bash
cd frontend && npx next --version    # expect 16.3.x
node -v                              # Next 16 needs Node 20.9+; you have 24.19 ✅
```

Then apply the §1.1 exclusions (root `tsconfig.json`, `.gitignore`) before the first commit.

```bash
cat > frontend/.env.local <<'EOF'
# Browser-visible: used by client components
NEXT_PUBLIC_API_URL=http://localhost:8000
# Server-side only: used by RSC fetches
API_URL=http://localhost:8000
EOF
```

Dependencies — deliberately minimal:

```bash
cd frontend
npm i zod                       # payload + form validation — see §5.1
npm i @tanstack/react-query     # only for authenticated client-side views (Phase 4)
```

No axios, no auth library. `fetch` with `credentials: 'include'` is the whole client.

### 5.1 Zod is the type boundary

`frontend/src/types/api.d.ts` describes what the API *should* send; Zod is what proves it did. Both exist because the two halves of this repo have no shared build step — a change to an API Resource can't break the frontend's compile, so it has to fail loudly at runtime instead.

Three jobs, and only three:

1. **Parse every API response** inside `lib/api.ts`, at the single fetch wrapper — never scattered through pages. A shape change in a Resource then surfaces as one clear parse error naming the field, not `undefined is not an object` three components deep.
2. **Derive the TS types** rather than hand-writing them twice: `export type Service = z.infer<typeof ServiceSchema>`. This replaces most of `api.d.ts` — keep that file only for things not on the wire (component props, form state). One source of truth per shape.
3. **Validate forms client-side** — login, register, the order form. The schema is the client-side check; Laravel's Form Request stays the real one. Never delete a backend rule because Zod covers it.

Conventions:

- One schema per API Resource, named to match: `ServiceResource` → `ServiceSchema`.
- **Mirror the Resource's field allow-list exactly.** Do not add fields "for later" — an over-broad schema silently re-admits the internal fields §4.2 works to keep out.
- Model nullable columns as `.nullable()`, absent-unless-loaded relations as `.optional()`. Conflating the two is the most common source of false parse failures against Eloquent payloads.
- Wrap paginated endpoints once in a generic `paginated(ItemSchema)` helper covering Laravel's `data` / `links` / `meta` envelope, rather than repeating it per endpoint.
- `safeParse` on reads so a bad payload renders an error state instead of a white screen; `parse` in dev where you want it loud.

Pin the major (`zod@^4`) and check `npm ls zod` — v3 and v4 differ enough on error formatting that mixed examples will waste your time.

### 5.2 What Next 16 changes for this plan

Four items where a Next 15-era tutorial will send you wrong:

| Area | Next 16 behaviour | Effect here |
|---|---|---|
| Bundler | **Turbopack is the default** for `dev` and `build` | Drop any `--turbopack` flag; if a Tailwind/PostCSS step misbehaves, `--webpack` is the escape hatch, not the default |
| Request APIs | `cookies()`, `headers()`, `params`, `searchParams` are **async** | Every RSC that forwards the session cookie must `await cookies()` — see §6.2 |
| Routing hooks | `middleware.ts` is replaced by **`proxy.ts`** | The Phase 4 auth redirect lives in `frontend/proxy.ts` — see §7 |
| Caching | `fetch` is no longer implicitly cached. **`use cache` requires `cacheComponents: true`** — it is opt-in, not the 16 default | We stayed on the default model: `fetch(..., { next: { revalidate } })`, set per call in `lib/api.ts`. Enabling Cache Components is its own migration (bundled guide `02-guides/migrating-to-cache-components.md`) and is deferred to §9 |

**Verified 2026-09-10** against the docs Next bundles at `frontend/node_modules/next/dist/docs/` — which `frontend/AGENTS.md` instructs any agent to read before writing code, since 16 diverges from older training data. All four rows confirmed; the caching row is the one that changed on inspection. An earlier draft of this plan had public pages opting into caching with `use cache`, which would have required a config flag this project has not set.

Two more from the same read, worth knowing before Phase 4:

- `images.domains` is **deprecated** — `images.remotePatterns` only. `next.config.ts` uses it, scoped to `/storage/**` on the API host so the optimizer cannot be aimed at arbitrary paths.
- 16.3+ ships a `next-dev-loop` skill for agent-driven runtime verification. **Not used here** — frontend verification in this project is manual, by Akmal.

### 5.3 Structure

```
frontend/
  src/
    app/
      layout.tsx
      page.tsx                    # home: hero slider + featured services
      services/page.tsx
      services/[slug]/page.tsx
      blog/page.tsx
      blog/[slug]/page.tsx
      (auth)/login/page.tsx       # Phase 4
      (auth)/register/page.tsx    # Phase 4
      account/                    # Phase 4-5, protected
    lib/
      api.ts                      # fetch wrapper: base URL, credentials, error mapping
      schemas.ts                  # zod schemas mirroring the API Resources
    types/api.d.ts                # public-API subset of the model types
  proxy.ts                        # Phase 4: /account redirect guard (was middleware.ts pre-16)
```

`frontend/src/types/api.d.ts` is written by hand and kept narrow — only the fields the API Resources actually emit. Resist importing `resources/js/types/models.d.ts` across the boundary even though it is now the same repo: those types describe the *admin* Inertia payloads, which include the internal fields the public API deliberately drops. Sharing them would make an over-broad type the source of truth for a narrower contract.

**Checkpoint:** `npm run dev` in `frontend/`; the home page renders the `home_hero` slides straight out of MySQL.

### 5.4 What shipped differently

- **`create-next-app` also wrote `frontend/AGENTS.md` and `frontend/CLAUDE.md`.** The managed block in `AGENTS.md` is re-added by `next dev` on every run, so it is committed rather than fought. It is why §5.2 above is now verified rather than provisional.
- **`?featured=1` was added to the services index.** The home page needed a featured strip and no filter existed; `Service` already had the scope. Two tests cover it, one specifically that `?featured=0` and an absent param behave identically, so the catalogue listing can never be silently narrowed.
- **`next: { revalidate: 60 }` instead of `use cache`** — see §5.2.
- **The auth half of `lib/api.ts` is not written yet.** Only `apiGet` / `apiGetOrNull` exist. The CSRF handshake lands in Phase 4 against the real Fortify endpoints rather than being guessed at now.
- **`frontend/.env.example` is not committed** — `frontend/.gitignore` ignores `.env*` wholesale, so an example file needs a `!.env.example` negation to be trackable. Worth adding when a second person clones this.

---

## 6. Phase 3 — Sanctum SPA auth

### 6.1 Backend

Enable in `config/fortify.php`:

```php
Features::registration(),
Features::emailVerification(),
```

Then:

1. Add `case Customer = 'customer';` to `App\Enums\UserRole` with a `label()` arm. Verify the `access-admin` gate rejects it (it should already — it matches on `Admin`/`Editor`).
2. `CreateNewUser` must assign `UserRole::Customer`. It currently has no role branch; a self-registered user must never default to a privileged role. **This is the highest-risk change in this plan — test it explicitly.**
3. Add the authenticated API group:

```php
Route::middleware('auth:sanctum')->prefix('v1')->name('api.v1.')->group(function () {
    Route::get('me', ...)->name('me');            // returns UserResource
    Route::get('orders', ...)->name('orders.index');
    Route::post('orders', ...)->name('orders.store');
    Route::get('orders/{order}', ...)->name('orders.show');
});
```

4. `OrderPolicy` gains customer-facing abilities scoped to `user_id === $user->id`. A customer must never read another customer's order, and never any order's `internal_note`. A separate `Api/V1/CustomerOrderResource` — not the admin resource — enforces that.

Fortify's own routes (`POST /login`, `/logout`, `/register`) live in the `web` group and are reached directly, not under `api/v1`. They already return JSON for `expectsJson()` requests.

### 6.2 The RSC cookie problem

Server components run on the Next server, which does **not** automatically forward the browser's cookies to Laravel. Two consequences:

- **Public pages** (`/`, `/services`, `/blog`) fetch in RSC and opt into caching with `use cache`. Fine as-is.
- **Authenticated pages** either fetch in a client component with `credentials: 'include'`, or fetch in RSC while manually forwarding the cookie header — `const jar = await cookies()` in Next 16, note the `await` — and leaving that fetch uncached.

Reading cookies in an RSC makes that segment dynamic, so it can never be a cached component. That is correct behaviour, not a problem to work around.

Default to **client components for everything authenticated**. It keeps one cookie path (the browser's), avoids accidentally caching one user's data into another's response, and the account area gains nothing from SSR.

### 6.3 Login handshake

Every mutating request from the browser follows this order:

```
GET  {API}/sanctum/csrf-cookie      → sets XSRF-TOKEN
POST {API}/login                    → header X-XSRF-TOKEN: <decoded cookie value>
GET  {API}/api/v1/me                → confirms the session
```

The `XSRF-TOKEN` cookie value is **URL-encoded** — decode it before putting it in the header, or every POST returns 419. Put this handshake in `lib/api.ts` once.

### 6.4 Tests

```bash
php artisan make:test --pest CustomerAuthApiTest
php artisan make:test --pest CustomerOrderApiTest
```

Must cover:

- Register → session established → `me` returns the user
- **A registered user gets `UserRole::Customer`**
- **A customer receives 403 from `/admin`**
- Login with bad credentials is rejected and throttled
- `me` unauthenticated returns 401, not a redirect
- A customer listing orders sees only their own
- A customer reading another customer's order gets 403
- `internal_note` and `assigned_to` are absent from the customer order payload

---

## 7. Phase 4-5 — Frontend auth and orders

1. `lib/api.ts` — one wrapper handling base URL, `credentials: 'include'`, the CSRF handshake, and mapping 401/403/419/422 to typed errors. 422 must surface Laravel's `errors` bag field-by-field.
2. `AuthProvider` — a client context calling `/api/v1/me` on mount; exposes `user`, `login`, `register`, `logout`.
3. `/login`, `/register`, `/forgot-password`, `/reset-password` pages.
4. `/account` — guarded shell; profile via Fortify's `user/profile-information` and `user/password`.
5. `/account/orders` — list own orders; order detail; create an order from a service page.

The guard is `frontend/proxy.ts` (Next 16's replacement for `middleware.ts`), and it can only see whether the session cookie *exists*, not whether it's valid — it's a redirect optimization, never the authorization boundary. The boundary is `auth:sanctum` plus `OrderPolicy` on the Laravel side.

**Checkpoint:** log in at `:3000`, hard-reload, still signed in; create an order; it appears in the admin panel's order list.

---

## 8. Running both

```bash
# terminal 1
cd ~/zk-sports && composer run dev
# terminal 2
cd ~/zk-sports/frontend && npm run dev
```

Use `localhost` consistently on both sides. Mixing `localhost` and `127.0.0.1` gives you two separate cookie jars and an afternoon of debugging 419s.

---

## 9. Deferred, deliberately

Not in scope until the above is green: tuning `use cache` lifetimes and `revalidateTag` invalidation from the admin panel, sitemap and structured data, image CDN, i18n, payments, order attachments, generating `frontend/src/types/api.d.ts` from the API Resources instead of by hand, and switching `routes/web.php`'s `/` redirect off the admin panel (do that only once the Next app is the real front door).
