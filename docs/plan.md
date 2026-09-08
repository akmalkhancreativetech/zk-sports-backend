# Admin Panel — Build Plan

Marketing website + admin panel for **zk-sports**, on the latest Laravel React starter kit (Laravel 13 + Inertia 3 + React 19 + TypeScript + Tailwind 4 + shadcn/ui, Fortify auth), **MySQL 8**, **with Wayfinder removed**.

> Installation and environment setup live in **`manual.md`** — run that first, end to end, before Phase 0 below.

Modules in scope:

1. **Sliders** — home hero sliders and their slides
2. **Services** — service catalogue shown on the public site
3. **Blog** — posts, categories, tags, SEO fields
4. **Orders** — inbound orders/enquiries against services, with a status workflow

---

## 1. Environment setup

Fully specified in **`manual.md`**. Summary of what it produces:

- **Bare Laravel 13** via `composer create-project laravel/laravel:^13.0 zk-sports` — no starter kit, no `laravel new`
- Inertia, React 19, TypeScript, Tailwind 4, and shadcn/ui layered on manually, step by step
- Auth via Fortify with hand-written Inertia pages (the starter kit's auth surface is the main thing this path costs you — budget 2–3 days)
- **No Wayfinder and no Ziggy.** Nothing pulls either in on a manual build, so §2 below is not a removal task — the route map in §2.2 is simply how routing works from the start.
- Composer upgraded 2.2.6 → 2.8.x (hard prerequisite)
- MySQL 8.0.41 database `zk_sports`, `utf8mb4` / `utf8mb4_unicode_ci`, collation pinned in `config/database.php`
- Vite configured with the `@` → `resources/js` alias and a WSL2-compatible HMR host

**Why Laravel 13, not 12:** Laravel 12's bug-fix window closed 2026-08-13 (security-only until 2027-02-24). Laravel 13 (2026-03-17) runs to Q3 2027 / March 2028 and requires PHP 8.3+ — you're on 8.4.

Do not start Phase 0 until every box in `manual.md` §14 is ticked.

---

## 2. Routing layer (no Wayfinder, no Ziggy)

On the manual build path there is nothing to remove — neither Wayfinder nor Ziggy is ever installed. §2.1 below is kept only as a reference for the alternate path (if you ever start from the official starter kit). **The section that matters is §2.2.**

### 2.1 Removal checklist — *reference only, not needed on the manual path*

1. `composer remove laravel/wayfinder`
2. `npm uninstall @laravel/vite-plugin-wayfinder`
3. `vite.config.ts` — delete the `wayfinder()` plugin entry and its import.
4. Delete generated dirs: `resources/js/routes/`, `resources/js/actions/`, `resources/js/wayfinder/`.
5. Remove the matching ignore lines from `.gitignore`.
6. Fix every broken import. Grep for them:
   ```bash
   grep -rn "@/routes\|@/actions\|@/wayfinder" resources/js
   ```
   Hits will be in `pages/auth/*`, `pages/settings/*`, `components/nav-*.tsx`, `components/app-sidebar.tsx`, and the layout files.
7. Replace each usage:
   - `<Form action={store.form()}>` → `<Form action="/login" method="post">` (Inertia 3 `<Form>` accepts a plain URL string + method).
   - `router.visit(dashboard())` → `router.visit('/dashboard')`.
   - `<Link href={edit(post.id)}>` → `<Link href={\`/admin/blog/posts/${post.id}/edit\`}>`.
8. `npm run build` and `php artisan test` to confirm nothing dangles.

### 2.2 The route map — **required**

With no route-generation layer, `resources/js/lib/routes.ts` is the single source of URLs. Do not scatter raw strings across components.

```ts
export const routes = {
  dashboard: '/admin',

  sliders: {
    index: '/admin/sliders',
    create: '/admin/sliders/create',
    store: '/admin/sliders',
    edit: (id: number | string) => `/admin/sliders/${id}/edit`,
    update: (id: number | string) => `/admin/sliders/${id}`,
    destroy: (id: number | string) => `/admin/sliders/${id}`,
    slides: {
      store: (sliderId: number | string) => `/admin/sliders/${sliderId}/slides`,
      update: (sliderId: number | string, id: number | string) =>
        `/admin/sliders/${sliderId}/slides/${id}`,
      destroy: (sliderId: number | string, id: number | string) =>
        `/admin/sliders/${sliderId}/slides/${id}`,
      reorder: (sliderId: number | string) => `/admin/sliders/${sliderId}/slides/reorder`,
    },
  },

  services: { /* same shape */ },
  blog: { posts: { /* … */ }, categories: { /* … */ }, tags: { /* … */ } },
  orders: {
    index: '/admin/orders',
    show: (id: number | string) => `/admin/orders/${id}`,
    updateStatus: (id: number | string) => `/admin/orders/${id}/status`,
    destroy: (id: number | string) => `/admin/orders/${id}`,
  },
} as const;
```

**Guardrail — not optional.** A Pest test that asserts every literal path in this file resolves against `Route::getRoutes()`. Without it the map rots silently and you find out when a user clicks a dead link. Wayfinder's build-time failure is exactly what this test is replacing; skip it and you have no safety net at all. Write it in Phase 0, before the first module route exists.

---

## 3. Foundations (before modules)

### 3.1 Access control

Two roles are enough at launch: `admin`, `editor`.

- Add `role` (string, default `editor`) to `users`, or install `spatie/laravel-permission` if per-module granularity is likely within six months. **Default: plain column.** Add the package later if needed; migrating up is cheap, migrating down is not.
- Gate: `Gate::define('access-admin', fn (User $u) => in_array($u->role, ['admin', 'editor']))`.
- Policies for each model. `editor` gets full CRUD on Sliders/Services/Blog, read + status-change on Orders. Only `admin` deletes Orders or manages users.

### 3.2 Admin layout

- `resources/js/layouts/admin-layout.tsx` — reuse the starter kit's sidebar shell rather than building fresh.
- Sidebar nav: Dashboard, Sliders, Services, Blog (Posts / Categories / Tags), Orders, Settings.
- Orders nav item shows a badge with the count of `status = new`.

### 3.3 Shared Inertia props

`HandleInertiaRequests::share()`:

```php
'auth' => ['user' => $request->user()?->only('id','name','email','role')],
'flash' => ['success' => fn () => $request->session()->get('success'),
            'error'   => fn () => $request->session()->get('error')],
'newOrdersCount' => fn () => $request->user()?->can('viewAny', Order::class)
    ? Order::where('status', 'new')->count() : 0,
```

Wrap `newOrdersCount` in a closure so it only evaluates on full page loads, not every partial reload.

### 3.4 Media handling

**Decision required.** Two viable paths:

| | Plain columns + Intervention | `spatie/laravel-medialibrary` |
|---|---|---|
| Setup | ~0 | one migration, some config |
| Multi-size variants | hand-rolled | built in (conversions) |
| Galleries | needs a JSON column or extra table | native collections |
| Lock-in | none | moderate |

Services need a gallery and Blog needs responsive featured images, so **medialibrary is the recommended pick**. If you'd rather stay dependency-light, use `image_path` columns plus a `media` polymorphic table for galleries only.

Whichever you pick, standardise now: WebP conversion on upload, max 2560px long edge, `public` disk, and a reusable `<ImageUploader />` React component.

### 3.5 Shared admin components

Build these once in `resources/js/components/admin/`:

- `DataTable` — TanStack Table + server-side pagination/sort/search, driven by query-string state through Inertia partial reloads.
- `ImageUploader` — drag-drop, preview, alt-text field, crop-aspect hint.
- `RichTextEditor` — TipTap. Configure the allowed node set explicitly; do not ship a kitchen-sink toolbar.
- `SortableList` — `@dnd-kit/sortable`, used by slides, services, and nav ordering.
- `SlugInput` — auto-derives from a title field, unlocks on manual edit.
- `StatusBadge`, `ConfirmDialog`, `FiltersBar`, `EmptyState`.

Cost of skipping this: four near-identical table implementations that drift apart by month two.

---

### 3.6 MySQL schema conventions

Apply these to every migration in the plan. They are the difference between a schema that survives a year and one that needs a maintenance window every time a status is added.

1. **No `enum` columns.** Use `string(20)` + a PHP enum cast. `ALTER TABLE … MODIFY ENUM` in MySQL rewrites and locks the whole table. Adding one order status to a 200k-row table becomes downtime. PHP enums give you the same type safety plus exhaustive `match()`.
2. **Slugs are lowercased on write, always.** `utf8mb4_unicode_ci` makes `Cricket-Kits` and `cricket-kits` collide at the unique index but *not* in a PHP `array_key_exists()` or `firstWhere()` comparison. Normalise with `Str::lower(Str::slug($title))` in a model mutator, and never compare slugs in PHP without normalising both sides.
3. **`decimal(12,2)` for all money.** Never `float`/`double`.
4. **JSON columns are fine** (MySQL 8) for `order_items.options` and gallery metadata — but never for anything you need to filter or sort on at scale. If you'd query it, it's a column.
5. **Every FK gets an explicit index.** MySQL auto-indexes FK columns, but composite lookup patterns (`orders (status, created_at)`, `slides (slider_id, sort_order)`) need their own.
6. **`FULLTEXT` for blog search.** `LIKE '%term%'` cannot use an index. Add `FULLTEXT(title, excerpt, content)` on `posts` and query with `MATCH … AGAINST` in boolean mode.
7. **Timestamps are UTC in the DB, `Asia/Karachi` at the display layer.** Set `APP_TIMEZONE=Asia/Karachi` but leave the DB in UTC; scheduled post publishing breaks subtly otherwise.
8. **Pin the collation** in `config/database.php` to `utf8mb4_unicode_ci`. MySQL 8 defaults to `utf8mb4_0900_ai_ci`; a mismatch between tables produces `Illegal mix of collations` on joins.

---

## 4. Module 1 — Sliders

### 4.1 Schema

`sliders`
| column | type | notes |
|---|---|---|
| id | id | |
| name | string | "Home Hero" |
| key | string, unique | `home_hero` — how the frontend fetches it |
| is_active | boolean, default true | |
| autoplay | boolean, default true | |
| interval_ms | unsigned int, default 5000 | |
| transition | string(20), default `slide` | cast to `SliderTransition` PHP enum — see §3.6 |
| timestamps | | |

`slides`
| column | type | notes |
|---|---|---|
| id | id | |
| slider_id | foreignId, cascade delete | |
| title | string, nullable | |
| subtitle | string, nullable | |
| body | text, nullable | |
| image_path | string | desktop, 1920×900 |
| mobile_image_path | string, nullable | 768×1000 |
| image_alt | string, nullable | required if image present — accessibility + SEO |
| cta_label | string, nullable | |
| cta_url | string, nullable | |
| cta_new_tab | boolean, default false | |
| text_position | string(10), default `left` | cast to PHP enum |
| overlay_opacity | tinyint, default 40 | 0–100 |
| sort_order | unsigned int, default 0 | |
| is_active | boolean, default true | |
| starts_at / ends_at | timestamp, nullable | scheduled campaign slides |
| timestamps | | |

Index: `slides (slider_id, sort_order)`.

### 4.2 Routes

```php
Route::resource('sliders', SliderController::class)->except('show');
Route::post('sliders/{slider}/slides', [SlideController::class, 'store']);
Route::put('sliders/{slider}/slides/{slide}', [SlideController::class, 'update']);
Route::delete('sliders/{slider}/slides/{slide}', [SlideController::class, 'destroy']);
Route::post('sliders/{slider}/slides/reorder', [SlideController::class, 'reorder']);
```

### 4.3 UI

- `pages/admin/sliders/index.tsx` — table: name, key, slide count, active toggle, updated at.
- `pages/admin/sliders/edit.tsx` — slider settings panel on top, drag-sortable slide cards below, slide editor in a sheet/modal. Live preview panel is a nice-to-have; defer it.
- Reorder posts the full `[{id, sort_order}]` array in one request. Do **not** fire one request per drag.

### 4.4 Frontend query

Scope the public read: `Slider::active()->with(['slides' => fn($q) => $q->live()->ordered()])->firstWhere('key', 'home_hero')`, where `live()` filters `is_active` plus the `starts_at`/`ends_at` window. Cache it with a tag invalidated on slider/slide save.

---

## 5. Module 2 — Services

### 5.1 Schema

`service_categories` — id, name, slug (unique), description (nullable), sort_order, is_active, timestamps.

`services`
| column | type | notes |
|---|---|---|
| id | id | |
| category_id | foreignId, nullable, nullOnDelete | |
| title | string | |
| slug | string, unique | |
| excerpt | string(300), nullable | card/listing text |
| description | longText, nullable | rich text |
| icon | string, nullable | lucide icon name |
| featured_image | string, nullable | |
| price_from | decimal(12,2), nullable | |
| price_unit | string, nullable | "per page", "per 1000" |
| is_featured | boolean, default false | |
| is_active | boolean, default true | |
| sort_order | unsigned int, default 0 | |
| meta_title / meta_description | string / string(320), nullable | |
| og_image | string, nullable | |
| timestamps + softDeletes | | orders reference services; never hard-delete |

Gallery via medialibrary collection `gallery`, or a `service_images` table (id, service_id, path, alt, sort_order).

**Decision:** flat `category_id` rather than self-referencing `parent_id`. Nested services generate recursive queries and breadcrumb logic you don't need for a marketing site. Revisit only if a real three-level taxonomy appears.

### 5.2 Routes & UI

Standard `Route::resource('services')` plus `Route::post('services/reorder')` and nested `Route::resource('service-categories')`.

- Index: table with category filter, active filter, search, drag-to-reorder within a category.
- Form tabs: **Content** (title, slug, excerpt, description, icon) / **Media** (featured image, gallery) / **Pricing** / **SEO** (meta fields + Google SERP preview component).

Soft delete matters here: order line items snapshot the service name and price, but the `service_id` FK should still resolve for reporting.

---

## 6. Module 3 — Blog

### 6.1 Schema

`categories` — id, name, slug (unique), description, meta_title, meta_description, timestamps.
`tags` — id, name, slug (unique), timestamps.
`post_tag` — post_id, tag_id (composite PK).

`posts`
| column | type | notes |
|---|---|---|
| id | id | |
| user_id | foreignId | author |
| category_id | foreignId, nullable, nullOnDelete | |
| title | string | |
| slug | string, unique | |
| excerpt | text, nullable | |
| content | longText | TipTap HTML or JSON — **pick one and stick to it** |
| featured_image | string, nullable | |
| featured_image_alt | string, nullable | |
| status | string(20), default `draft` | cast to `PostStatus` PHP enum |
| published_at | timestamp, nullable | |
| reading_time | unsigned smallint, nullable | computed on save |
| views | unsigned int, default 0 | |
| is_featured | boolean, default false | |
| meta_title | string, nullable | |
| meta_description | string(320), nullable | |
| canonical_url | string, nullable | |
| og_image | string, nullable | |
| focus_keyword | string, nullable | |
| seo_score | tinyint, nullable | 0–100 |
| timestamps + softDeletes | | |

Indexes: `posts (status, published_at)`, `posts (category_id)`, unique on `slug`.

### 6.2 Publishing

`status = scheduled` + a future `published_at`. A `posts:publish-scheduled` command on the scheduler flips them to `published`. Public scope: `where('status','published')->where('published_at','<=',now())`.

Don't rely on `published_at <= now()` alone as the status source — you lose the ability to unpublish without destroying the original publish date.

### 6.3 SEO panel (Yoast-style)

Client-side analyser in `resources/js/lib/seo-analyzer.ts`, returning a checklist plus a 0–100 score persisted to `seo_score`:

- Focus keyword in title / slug / first paragraph / at least one H2 / meta description
- Keyword density 0.5–2.5%
- Meta title 50–60 chars, meta description 140–160 chars
- Featured image present and has alt text
- At least one internal and one external link
- Flesch reading ease band

Render as a right-hand sidebar with red/amber/green rows, plus a live Google SERP preview.

Keep the analyser **pure and client-side** — no API round trip per keystroke. Debounce at 400ms.

### 6.4 UI

- `pages/admin/blog/posts/index.tsx` — filters: status, category, author, date range; bulk publish/unpublish/delete.
- `pages/admin/blog/posts/edit.tsx` — two-column: editor left, sticky sidebar right (status/schedule, category, tags, featured image, SEO panel).
- Autosave drafts every 30s via `router.patch(..., { preserveScroll: true, only: [] })`.

---

## 7. Module 4 — Orders

**Assumption to confirm:** orders are quotation-style enquiries (customer submits a request → you quote → they approve), not card-checkout e-commerce. The schema below reflects that. If real payments are in scope, this module roughly doubles in size and needs a payments table, gateway webhooks, and refund handling.

### 7.1 Schema

`orders`
| column | type | notes |
|---|---|---|
| id | id | |
| order_number | string, unique | `ORD-2026-000123`, generated in a DB transaction |
| user_id | foreignId, nullable, nullOnDelete | null for guest submissions |
| customer_name / customer_email / customer_phone | string | |
| company | string, nullable | |
| status | string(20), default `new` | cast to `OrderStatus` PHP enum; see workflow below |
| source | string, default `website` | website / phone / referral |
| assigned_to | foreignId users, nullable | |
| currency | char(3), default `PKR` | |
| subtotal / discount / tax / total | decimal(12,2), default 0 | |
| customer_note | text, nullable | |
| internal_note | text, nullable | never exposed publicly |
| quoted_at / approved_at / completed_at | timestamp, nullable | |
| timestamps + softDeletes | | |

`order_items` — id, order_id (cascade), service_id (nullable, nullOnDelete), **name** (snapshot), description, quantity, unit_price, line_total, options (json), timestamps.

`order_status_histories` — id, order_id, from_status, to_status, user_id (nullable), note, created_at.

`order_attachments` — id, order_id, path, original_name, mime_type, size, uploaded_by (nullable), created_at.

Indexes: `orders (status, created_at)`, `orders (customer_email)`, `orders (assigned_to)`, `order_items (order_id)`.

### 7.2 Status workflow

```
new → reviewing → quoted → approved → in_progress → completed
                     ↓         ↓            ↓
                 cancelled  cancelled    cancelled
                     ↓
                 rejected
```

Enforce transitions in a `OrderStatus` enum with an `allowedTransitions()` method — not in the controller, and definitely not only in the React select. Every change writes an `order_status_histories` row inside the same transaction.

### 7.3 Money

Store `DECIMAL(12,2)` in MySQL, cast to a Money value object or integer minor units in PHP. Never `float`, and never MySQL `FLOAT`/`DOUBLE` — `0.1 + 0.2` problems surface in customer-visible totals. Totals are recalculated server-side from `order_items` on every write; the client-side total is display only.

### 7.4 Routes & UI

```php
Route::get('orders', [OrderController::class, 'index']);
Route::get('orders/{order}', [OrderController::class, 'show']);
Route::patch('orders/{order}', [OrderController::class, 'update']);          // items, notes, assignment
Route::post('orders/{order}/status', [OrderStatusController::class, 'store']);
Route::post('orders/{order}/attachments', [OrderAttachmentController::class, 'store']);
Route::get('orders/{order}/quote.pdf', [OrderQuoteController::class, 'show']);
Route::delete('orders/{order}', [OrderController::class, 'destroy'])->middleware('can:delete,order');
Route::get('orders/export', [OrderExportController::class, 'index']);        // CSV
```

- Index: status tabs with counts, search by order number / email / name, date range, assignee filter, CSV export.
- Show: customer block, editable line items, totals, status timeline from `order_status_histories`, attachments, internal notes thread.
- Quote PDF via `spatie/laravel-pdf` or DomPDF — phase 5, not launch.

### 7.5 Notifications

Queued, never inline:

- New order → mail to admin group + optional Slack/WhatsApp webhook.
- `quoted` → mail to customer with the quote.
- `completed` → mail to customer.

Requires `QUEUE_CONNECTION=database` and a Supervisor-managed `queue:work` in production.

---

## 8. Directory layout

```
app/
  Enums/OrderStatus.php, PostStatus.php
  Http/Controllers/Admin/{Slider,Slide,Service,ServiceCategory,Post,Category,Tag,Order,OrderStatus}Controller.php
  Http/Requests/Admin/…
  Http/Resources/…                     # keep Inertia payloads lean and typed
  Models/{Slider,Slide,Service,ServiceCategory,Post,Category,Tag,Order,OrderItem,OrderStatusHistory}.php
  Policies/…
  Services/{OrderNumberGenerator,OrderTotalsCalculator,SlugGenerator}.php
resources/js/
  components/admin/{DataTable,ImageUploader,RichTextEditor,SortableList,SlugInput,SeoPanel,StatusBadge}.tsx
  layouts/admin-layout.tsx
  lib/routes.ts
  lib/seo-analyzer.ts
  pages/admin/{dashboard,sliders,services,blog,orders}/…
  types/{models.d.ts,inertia.d.ts}
routes/admin.php                       # loaded from web.php inside the admin group
```

### TypeScript models

Hand-maintaining `models.d.ts` against PHP models drifts. Either generate it (`spatie/typescript-transformer` with attributes on models) or write a Pest test that fails when a model's `$fillable` gains a field absent from the TS interface. Pick one at Phase 0.

---

## 9. Phases

| Phase | Scope | Done when |
|---|---|---|
| **0** | `manual.md` end to end (bare Laravel 13 → Inertia/React/TS → shadcn → Fortify auth pages), `routes.ts` + parity test, roles/gate, admin layout, shared components, media decision | Login works, empty admin shell loads, `npm run build` and `npx tsc --noEmit` clean, `php artisan test` green |
| **1** | Sliders + slides, reorder, public hero endpoint | Home hero renders from DB |
| **2** | Service categories + services, gallery, SEO fields, public listing/detail | Services live on the site |
| **3** | Blog: posts, categories, tags, scheduling, SEO panel, autosave | Post can be drafted, scheduled, and published |
| **4** | Orders: submission form, admin index/show, status workflow, history, notifications | Order flows new → completed with email at each step |
| **5** | Dashboard widgets, quote PDF, CSV export, audit log, sitemap.xml, cache layer | — |

Dependencies: 0 blocks everything. 4 depends on 2 (line items reference services). 1, 2, 3 are parallelisable.

---

## 10. Testing

- Pest feature tests per controller: auth required, policy enforced, validation rejects bad input, happy path persists.
- `OrderStatus` transition matrix — table-driven test of every allowed and forbidden pair.
- Route-parity test for `routes.ts`.
- Factories + seeders for all models; a `DemoSeeder` producing one slider with 4 slides, 3 categories × 5 services, 20 posts, 30 orders spread across statuses.
- Vitest for `seo-analyzer.ts` (pure function, cheap to cover).

---

## 11. Risks and open decisions

**Risks**

1. *Phase 0 is 2–3 days of auth scaffolding before any module work.* Building from bare Laravel means writing login, password reset, email verification, 2FA, settings pages, and the app shell by hand. Mitigation: keep the auth pages deliberately plain — no custom design work until the four modules ship. Resist the urge to polish a login screen nobody but you will see.
2. *No route type-safety at all.* Neither Wayfinder nor Ziggy is present, so a wrong URL is a runtime 404, not a build error. Mitigation: `routes.ts` + the parity test in §2.2, written in Phase 0. Without that test this is the single most likely source of production bugs in this build.
3. *Rich-text content format churn.* Switching TipTap HTML ↔ JSON mid-project means a data migration across every post and service. Decide in Phase 0.
4. *Float money in orders.* Silent rounding errors compound across line items and are invisible until a customer disputes a total. Mitigation: `decimal(12,2)` + server-side recalculation, enforced by a test.
5. *Order number race under concurrent submissions.* Two simultaneous submissions can collide on a `MAX(id)+1` scheme. MySQL has no sequences, so this needs handling explicitly. Mitigation: a `counters` table read with `lockForUpdate()` inside the creating transaction, or derive the number from the auto-increment PK after insert. Unique index on `order_number` as backstop either way.
6. *N+1 on every index page.* Inertia payloads make these easy to miss. Mitigation: `Model::preventLazyLoading()` in `AppServiceProvider` for non-production.
7. *Unbounded image uploads.* A 12MB hero PNG on the homepage kills LCP. Mitigation: enforce max dimensions and WebP conversion at upload, not at render.

**Decisions to lock before Phase 1**

- [ ] Media: medialibrary vs. plain columns
- [ ] Rich text storage: HTML vs. JSON
- [ ] Roles: `role` column vs. spatie/laravel-permission
- [ ] Orders: quotation-only (assumed) vs. payments in scope
- [ ] TS model types: generated vs. hand-written + parity test
- [ ] Fortify features to enable — registration almost certainly **off** for an admin panel; seed the first admin instead
- [x] ~~Database~~ — **locked: MySQL 8**