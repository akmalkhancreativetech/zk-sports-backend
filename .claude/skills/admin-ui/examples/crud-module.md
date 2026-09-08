# New CRUD module, end to end

The order matters: backend and tests first, frontend last. Sliders
(`app/Http/Controllers/Admin/SliderController.php` +
`resources/js/pages/admin/sliders/`) is the reference implementation — copy its
shape.

## 1. Backend

```
app/Enums/<Thing>Status.php              string-backed, with label()
database/migrations/..._create_<things>_table.php
app/Models/<Thing>.php                   casts, relations, #[Scope]s
app/Policies/<Thing>Policy.php           editors CRUD, admins delete
app/Http/Requests/Admin/<Thing>Request.php
app/Http/Controllers/Admin/<Thing>Controller.php
database/factories/<Thing>Factory.php    plus named states
```

Schema rules (plan.md §3.6): no MySQL `enum` — `string(20)` + a PHP enum cast;
`decimal(12,2)` for money; lowercase slugs on write; an explicit index for every
composite lookup pattern.

If the model has a slug or key that is normalised on save, **also normalise it in
`prepareForValidation()`** — otherwise `"Home Hero"` passes the `unique` rule and
then collides with the existing `home_hero` at the index.

## 2. Routes

```php
// routes/admin.php — non-resource routes BEFORE the resource,
// or `{thing}` swallows them.
Route::get('things/{thing}/preview', [ThingController::class, 'preview'])->name('things.preview');
Route::resource('things', ThingController::class)->except('show');
```

## 3. Tests, before any UI

Pest feature tests in `tests/Feature/<Thing>Test.php`:

- guests redirected, editor allowed, admin-only delete forbidden for editor
- index: paginated shape (`things.data`, `things.total`), search, allowed sort,
  **rejected arbitrary sort**
- validation: each rule that matters, as a dataset
- happy path persists and flashes `success`
- Inertia payload has no leaked fields

The Inertia test helper asserts the page component **file exists**, so these fail
until step 5. That is the intended order.

## 4. Route map

Add the URLs to `resources/js/lib/routes.ts` and delete the matching entries from
`PLANNED` in `tests/Feature/RouteMapTest.php`. That test fails in both
directions, so a stale `PLANNED` entry is caught too.

## 5. Frontend

```
resources/js/types/models.d.ts           <Thing>ListItem, <Thing>
resources/js/components/admin/<thing>-form.tsx    shared create + edit
resources/js/pages/admin/things/index.tsx         DataTable
resources/js/pages/admin/things/create.tsx
resources/js/pages/admin/things/edit.tsx
```

Then flip `ready: true` in `resources/js/lib/nav.ts`.

Expose PHP enums to selects as `{value, label}` pairs from the controller — never
hardcode the options in TSX, or they drift from the enum:

```php
private function statuses(): array
{
    return array_map(
        fn (ThingStatus $c) => ['value' => $c->value, 'label' => $c->label()],
        ThingStatus::cases(),
    );
}
```

## 6. Verify

```bash
npx tsc --noEmit
npm run build
./vendor/bin/pint
php artisan test
```

All four clean. Then hand the UI to Akmal — state plainly that the frontend is
unverified and name the riskiest parts (usually Base UI composition and any
multipart form).

## Checklist before calling it done

- [ ] Index has empty, loading and error states
- [ ] Sort whitelist enforced server-side, tiebreak `orderBy('id')` present
- [ ] Submit buttons disable and relabel while `processing`
- [ ] Edit form save disabled when `!isDirty`
- [ ] Destructive action confirms and names its blast radius
- [ ] Icon-only buttons have `sr-only` labels
- [ ] Permission-gated controls hidden via a `can*` prop, and authorised server-side
- [ ] Any query-builder `update()` triggers cache/side effects explicitly
- [ ] Nav item flipped to `ready: true`, breadcrumbs resolve
- [ ] Both themes checked with tokens only
