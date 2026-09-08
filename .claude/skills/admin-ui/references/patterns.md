# Patterns

## The four list states

Every list, table and panel handles all four. Missing one is the most common way
an admin panel feels unfinished.

| State | Treatment |
|---|---|
| Loaded | the content |
| Empty | dashed-border box, one sentence saying what to do next, and the button that does it — never "No data" |
| Loading | `Skeleton` rows matching the real row height. Inertia partial reloads are fast, so only show it where a request can be slow |
| Error | field errors next to fields; a failed request also raises a toast. Never a blank screen |

```tsx
if (items.length === 0) {
    return (
        <div className="rounded-lg border border-dashed p-8 text-center">
            <p className="text-sm text-muted-foreground">
                No slides yet. Add one to build the slider.
            </p>
        </div>
    );
}
```

## Forms

Use Inertia's `useForm`. A shared form component serves both create and edit —
the presence of the record decides the verb.

```tsx
const { data, setData, post, put, processing, errors, isDirty } = useForm({ ... });

const submit = (e: React.FormEvent) => {
    e.preventDefault();
    (record ? put : post)(action, { preserveScroll: true });
};

<Button type="submit" disabled={processing || (Boolean(record) && !isDirty)}>
    {processing ? 'Saving…' : record ? 'Save changes' : 'Create slider'}
</Button>
```

Rules:

- **`processing` disables the submit and changes its label.** Non-negotiable.
- **`isDirty` disables save on an unchanged edit form** — stops pointless writes.
- **Errors render next to their field**, from `errors.<field>`. A toast alone
  hides which input is wrong.
- **`preserveScroll: true`** on every submit, or long forms jump to the top.
- Every input has a real `<Label htmlFor>`. Placeholders are not labels.
- Derived fields (slug/key from a title) auto-fill until the user edits them,
  then lock. Track it with a `keyLocked` boolean.

### Multipart and PUT

`multipart/form-data` cannot carry PUT, so Laravel's method spoofing is needed —
and `useForm().transform()` returns `void`, so it cannot be chained:

```tsx
// ✗ transform() does not return the form
form.transform((d) => ({ ...d, _method: 'put' })).post(url, opts);

// ✓ set it, then post — and reset it on the create path, it persists
if (record) {
    form.transform((d) => ({ ...d, _method: 'put' }));
    form.post(updateUrl, { forceFormData: true, ...opts });
} else {
    form.transform((d) => d);
    form.post(storeUrl, { forceFormData: true, ...opts });
}
```

## Sheets vs dialogs vs pages

| Use | For |
|---|---|
| Page | the primary record being edited (slider settings) |
| `Sheet` | a child record with many fields (a slide) — keeps list context visible |
| `Dialog` | a short focused task, 1–3 fields |
| `AlertDialog` | destructive confirmation only |

A sheet holding a long form needs `flex flex-col` with the form
`overflow-y-auto` and the footer outside the scroll area. Reset the form when the
target record changes:

```tsx
useEffect(() => {
    if (editing === null) return;
    clearErrors();
    setData({ /* from the record, or defaults */ });
}, [editing]);
```

## Uploads

`@/components/admin/image-uploader` handles drag-drop, preview, and replace.

- **Revoke object URLs** in the effect cleanup or the tab leaks memory per
  selection.
- Show the stored image when there is no new file, so an edit form does not look
  empty.
- Alt text is a **required** sibling field — enforced server-side too.
- State the processing contract in the hint ("Converted to WebP, capped at
  2560px") so nobody uploads a 12MB PNG expecting it untouched.

## Drag-to-reorder

`@dnd-kit` with `SortableContext` + `verticalListSortingStrategy`.

- **Register `KeyboardSensor` with `sortableKeyboardCoordinates`.** Mouse-only
  reordering is an accessibility failure.
- `PointerSensor` needs `activationConstraint: { distance: 6 }` or every click on
  a row starts a drag.
- Only the handle gets `{...attributes} {...listeners}`, with `touch-none` and an
  `aria-label`.
- **Persist the whole order in one request**, never one per drag. Optimistically
  reorder local state, then roll back in `onError`:

```tsx
setItems(reordered);
router.post(reorderUrl, { slides: reordered.map((s, i) => ({ id: s.id, sort_order: i })) },
    { preserveScroll: true, preserveState: true, onError: () => setItems(serverItems) });
```

- Re-sync local state from props in an effect, so add/delete/reorder from the
  server wins.
- **Server-side:** a query-builder `update()` fires **no model events**. Anything
  hanging off `saved`/`deleted` (cache invalidation, search indexing) must be
  triggered explicitly in the controller.

## Breadcrumbs

`BreadcrumbItem` **and** `BreadcrumbSeparator` both render an `<li>`. Putting the
separator inside an item is invalid HTML (`<li>` cannot descend from `<li>`) and
React reports a hydration error. They are siblings:

```tsx
// ✗ nested <li> — hydration error
<BreadcrumbItem>
  <BreadcrumbSeparator />
  <BreadcrumbPage>{crumb.title}</BreadcrumbPage>
</BreadcrumbItem>

// ✓ separator is a sibling; Fragment carries the key
<Fragment key={crumb.href}>
  <BreadcrumbSeparator />
  <BreadcrumbItem>
    <BreadcrumbPage>{crumb.title}</BreadcrumbPage>
  </BreadcrumbItem>
</Fragment>
```

`AdminLayout` builds the trail from `@/lib/nav`, so pages never write this
themselves.

## Feedback

Backend puts `success`/`error` in the session; `HandleInertiaRequests` shares it
as `flash`; `AdminLayout` turns it into a toast. So a controller just does:

```php
return back()->with('success', 'Slide order saved.');
```

Never add a second toast in the component for the same event.

**Exception — Fortify's own endpoints.** `PUT /user/profile-information` and
`PUT /user/password` flash a machine key (`profile-information-updated`), not a
message, so there is nothing for the bridge to show.

`@/lib/form-feedback` has one helper per case, and **picking the wrong one is how
you get two toasts for one save**:

| Helper | Use for | Raises |
|---|---|---|
| `formToasts(msg, onDone?)` | Fortify endpoints — they flash no message | success **and** error |
| `formErrorToast(onDone?)` | our controllers — they flash `success` | error only |

```tsx
// ✗ double toast: the controller flashes AND this raises one
form.post(routes.services.store, { ...formToasts('Service created.') });

// ✓ success comes from the flash bridge
form.post(routes.services.store, { ...formErrorToast() });
```

Rule of thumb: **our controllers flash, Fortify's endpoints toast client-side.**
Field errors always stay inline; the error toast only says that something failed,
for when the form is scrolled out of view.

## Inputs that reload their own value

An input whose value comes from page props must be **controlled**, not seeded
with `defaultValue`. After a save, Inertia replaces the props, the default
changes, and Base UI warns:

> A component is changing the default value state of an uncontrolled
> FieldControl after being initialized.

Hold it in local state, sync from props in an effect, and save on blur:

```tsx
const [alt, setAlt] = useState(image.alt ?? '');
useEffect(() => setAlt(image.alt ?? ''), [image.alt]);

<Input value={alt} onChange={(e) => setAlt(e.target.value)} onBlur={save} />
```

## Sidebar and navigation

- Nav is defined once in `@/lib/nav` and consumed by both sidebar and
  breadcrumbs. Do not hand-write breadcrumbs per page.
- `isActive()` uses longest-prefix matching so `/admin/sliders/3/edit` highlights
  Sliders, while `/admin` matches only itself.
- Unbuilt modules render disabled with a "Soon" badge — never a dead link.
- Sidebar collapse state persists in the `sidebar_state` cookie, read
  **server-side** and shared as `sidebarOpen`, so it renders correctly on first
  paint instead of snapping after hydration.
- That cookie is written by JavaScript, so it must be listed in
  `$middleware->encryptCookies(except: [...])` — otherwise decryption fails,
  `$request->cookie()` returns null, and the sidebar is stuck open forever.

## Dark mode

`next-themes` at the app root with `attribute="class"`, plus the pre-paint script
in `app.blade.php`. Tailwind 4 declares `@custom-variant dark (&:is(.dark *))` in
`app.css`. Use theme tokens only — a hardcoded `bg-white` is a dark-mode bug.

## Accessibility floor

Not optional, and cheap if done as you go:

- Icon-only buttons: `<span className="sr-only">Delete {name}</span>`.
- Never remove focus rings; `app.css` already sets `outline-ring/50`.
- Sortable table headers are real `<button>`s.
- Decorative images get `alt=""`; content images get real alt text.
- Toggle visibility with `hidden` / conditional render, not `opacity-0` alone —
  an invisible focusable element is a keyboard trap.
- Live-updating counts (`newOrdersCount`) belong in a badge with text, not colour
  alone.
