---
name: admin-ui
description: Build or change any admin screen in this repo — pages under resources/js/pages/admin/, layouts, tables, forms, sheets, dialogs, sidebar nav, or anything importing from @/components/ui. Encodes this stack's conventions and the Base UI / TanStack Table v9 gotchas that break every tutorial written before 2026. Read BEFORE writing the first line of a new admin page or component.
---

# Admin panel UI/UX

This is an **admin panel only**. The public marketing site is a separate Next.js
client that will consume an API; `/` redirects guests to `/login` and staff to
`/admin`. Never add a public-facing page here.

## The stack, and what it costs you

| | Version | The catch |
|---|---|---|
| React | 19 | — |
| Inertia | 3 | `<Form>` component exists; page props typed in `types/inertia.d.ts` |
| Tailwind | 4 | **No `tailwind.config.js`.** Configure in `resources/css/app.css` |
| shadcn/ui | style `base-nova` | Built on **Base UI**, not Radix — see below |
| Base UI | 1.7 | `render` prop, not `asChild`; strict context parents |
| TanStack Table | **9** | Full API rewrite; every v8 tutorial fails to compile |
| dnd-kit | 6.3 | — |
| TypeScript | 7 | No `baseUrl`; `paths` must be relative (`./resources/js/*`) |

**Verification rule:** run `npx tsc --noEmit` and `php artisan test`. Do **not**
drive a browser or claim the UI works — Akmal checks the UI manually. Say plainly
what is unverified.

## Non-negotiables

1. **Every admin page renders `AdminLayout`** with `title`, and `description` /
   `actions` where they earn their place. It supplies the sidebar, breadcrumbs,
   page header and flash-to-toast bridge.
2. **URLs come from `@/lib/routes`.** Never inline a path string. Adding a URL
   means updating `routes.ts`, and `tests/Feature/RouteMapTest.php` enforces that
   every entry resolves — including a `PLANNED` allowlist for unbuilt modules
   that is checked in both directions.
3. **New module → flip `ready: true` in `@/lib/nav`.** Unbuilt items render
   disabled with a "Soon" badge rather than as dead links.
4. **Server does the work.** Sorting, filtering, pagination and search are
   query-string state through Inertia partial reloads. Never load a full table
   client-side and sort in the browser.
5. **Destructive actions need `AlertDialog`** naming the thing and its blast
   radius ("and all 4 of its slides, including image files").
6. **Alt text is required on every upload.** Validated server-side, not just in
   the form.
7. **Hide what the user cannot do.** Pass a `can*` boolean from the controller
   (`canDelete`) and omit the control — do not render a button that 403s.

## The enterprise bar

"Enterprise level" here means boring, predictable and unembarrassing under load —
not decorative. A screen is not done until all of these hold:

- **Every async action shows its state.** Buttons disable and change label while
  `processing`. Tables that reload show it. No silent dead clicks.
- **Every list has four states**: loaded, empty, loading, error. The empty state
  says what to do next, not "No data".
- **Every mutation gives feedback** — a flash message becomes a toast. Failures
  surface field-level errors next to the field, never only a toast.
- **Nothing is destroyed without confirmation** naming the target and its blast
  radius, and unsaved form changes warn before navigation.
- **Keyboard reaches everything.** Drag-reorder has a keyboard sensor, dialogs
  trap and restore focus, `focus-visible` rings are never removed.
- **Screen readers get labels.** Icon-only buttons carry `sr-only` text, inputs
  have real `<Label htmlFor>`, images have alt text.
- **Long values never break layout.** `truncate` + `min-w-0` on flex children;
  tables scroll their own container.
- **Both themes are correct.** Only theme tokens, never a hardcoded colour.
- **Permissions are reflected, not enforced client-side.** Hide what the user
  cannot do; the server still authorises.
- **Numbers align** (`tabular-nums`) and dates render in the user's locale.

## Read next

- `references/base-ui.md` — **read before using any `@/components/ui` primitive.**
  The `render` prop, required context parents, and the real data-attribute names.
- `references/data-table.md` — the server-driven table contract, controller and
  page sides.
- `references/patterns.md` — forms, sheets, uploads, drag-reorder, toasts, dark
  mode, the four list states, accessibility floor.
- `references/auth-flow.md` — the auth surface and its screens. **Registration is
  deliberately disabled** — never add it.
- `examples/crud-module.md` — end-to-end skeleton for a new module.

## Component inventory

Installed (`@/components/ui`): `alert-dialog avatar badge breadcrumb button
calendar card collapsible command dialog dropdown-menu input input-group label
popover scroll-area select separator sheet sidebar skeleton sonner switch table
tabs textarea tooltip`.

Shared admin components (`@/components/admin`): `app-sidebar`, `data-table`,
`image-uploader`, `nav-user`, `slider-form`, `slide-sheet`, `sortable-slides`.
`@/components/slider-hero` is deliberately app-agnostic so it can be lifted into
the Next.js front end.

Add a missing primitive with `npx shadcn@latest add <name>`. It will prompt to
overwrite shared deps (`button`, `input`, `separator`, `sheet`, `skeleton`) —
back up `resources/js/components/ui` first; there is no git repo here.

## Visual conventions

- Page body is a `flex flex-col gap-6` column from `AdminLayout`; sections are
  `Card`s or bare `div`s, never nested cards.
- Stat tiles: `grid gap-4 sm:grid-cols-2 xl:grid-cols-4`. Numbers get
  `tabular-nums`.
- Status uses `Badge`: `secondary` for active/positive, `outline` for
  inactive/neutral, `destructive` for error. Never colour text alone — that
  fails for colourblind users.
- Icons are `lucide-react` at `size-4` inline, `size-3.5` in dense rows.
- Wide content (tables, code) scrolls inside `overflow-x-auto`; the page body
  must never scroll horizontally.
- Never hardcode a colour. Use the theme tokens (`bg-card`,
  `text-muted-foreground`, `border`) so dark mode works for free.

## Honest placeholders

Do not invent data. A module that is not built shows `—` with "Not built yet ·
Phase N", not a fabricated number. A metric that needs a query that does not
exist yet is absent, not zeroed.
