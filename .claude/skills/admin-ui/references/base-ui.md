# Base UI, not Radix

shadcn is installed with style `base-nova`, so every `@/components/ui` primitive
wraps **`@base-ui/react`**. Radix-era snippets — which is nearly everything
written before 2026, including older shadcn docs and most community blocks —
either fail to compile or throw at runtime.

Three translations cover almost all of it.

## 1. `render`, not `asChild`

Radix composed via `asChild` + a single child. Base UI takes a `render` prop
holding an **element**, and merges props into it.

```tsx
// ✗ Radix — asChild does not exist
<Button asChild><Link href="/admin">Dashboard</Link></Button>

// ✓ Base UI
<Button render={<Link href="/admin" />}>Dashboard</Button>
```

Applies to `Button`, `SidebarMenuButton`, `SidebarMenuSubButton`,
`BreadcrumbLink`, `Badge`, `DropdownMenuTrigger`, `CollapsibleTrigger`, and
anything else built on `useRender`. Children stay as children; only the *element
being rendered* moves into `render`.

### Rendering a link through a Button needs `nativeButton={false}`

`nativeButton` defaults to **true**, so `Button` expects the `render` element to
be a real `<button>`. Inertia's `Link` is an `<a>`, which drops native button
semantics and logs a console warning.

**Use `@/components/link-button` instead of doing this by hand** — it exists
precisely so the flag cannot be forgotten:

```tsx
// ✗ warns: "expected a native <button> because the `nativeButton` prop is true"
<Button variant="outline" render={<Link href={routes.sliders.index} />}>Back</Button>

// ✓
<LinkButton href={routes.sliders.index} variant="outline">Back</LinkButton>
```

`SidebarMenuButton` and `SidebarMenuSubButton` are built on `useRender` rather
than the button primitive, so they take `render={<Link/>}` with no flag.

Nesting works, and is how the sidebar composes:

```tsx
<CollapsibleTrigger
  render={
    <SidebarMenuButton tooltip={item.title} isActive={active}>
      <item.icon />
      <span>{item.title}</span>
    </SidebarMenuButton>
  }
/>
```

## 2. Some parts throw without a context parent

Base UI asserts on its context. These are **runtime** errors, invisible to `tsc`.

| Part | Required ancestor | Error if missing |
|---|---|---|
| `DropdownMenuLabel` | `DropdownMenuGroup` **or** `DropdownMenuRadioGroup` | `MenuGroupContext is missing` |
| `DropdownMenuRadioItem` | `DropdownMenuRadioGroup` | `MenuRadioGroupContext is missing` |
| any menu part | `DropdownMenu` | `MenuRootContext is missing` |
| `AvatarImage` / `AvatarFallback` | `Avatar` | `AvatarRootContext is missing` |
| `CollapsibleTrigger` / `CollapsibleContent` | `Collapsible` | `CollapsibleRootContext is missing` |

The label case actually bit us — a bare `DropdownMenuLabel` crashed the page
render when the user menu opened:

```tsx
// ✗ throws
<DropdownMenuContent>
  <DropdownMenuLabel>{user.name}</DropdownMenuLabel>
</DropdownMenuContent>

// ✓ wrap it
<DropdownMenuGroup>
  <DropdownMenuLabel>{user.name}</DropdownMenuLabel>
</DropdownMenuGroup>

// ✓ or put it inside the RadioGroup it labels
<DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
  <DropdownMenuLabel>Appearance</DropdownMenuLabel>
  <DropdownMenuRadioItem value="light">Light</DropdownMenuRadioItem>
</DropdownMenuRadioGroup>
```

When one of these fires, **audit the whole file for the same class of mistake**
rather than fixing only the part that threw. The full set of error strings:

```bash
grep -rho "[A-Za-z]*Context is missing[^\"']*" node_modules/@base-ui/react/*/*/*.js | sort -u
```

## 3. Data attributes differ from Radix — and by part

Never guess these. `tsc` cannot check a Tailwind class string, so a wrong
attribute is silently dead styling.

| Where | Attribute |
|---|---|
| Collapsible **root** | `data-open` / `data-closed` |
| Collapsible **trigger** | `data-panel-open` |
| Menu / popover **trigger** | `data-popup-open`, `data-pressed` |
| Transitions | `data-starting-style` / `data-ending-style` |

The trap: `group/collapsible` sits on the **root**, so a chevron must key off the
root's attribute, not the trigger's.

```tsx
// ✗ data-panel-open lives on the trigger — never matches from the root group
<ChevronRightIcon className="group-data-[panel-open]/collapsible:rotate-90" />

// ✓
<ChevronRightIcon className="group-data-open/collapsible:rotate-90" />
```

To confirm an attribute, read the generated constants:

```bash
cat node_modules/@base-ui/react/collapsible/root/CollapsibleRootDataAttributes.js
cat node_modules/@base-ui/react/menu/trigger/MenuTriggerDataAttributes.js
```

## Controlled dialogs and sheets

Base UI uses `open` / `onOpenChange`. Note `AlertDialogAction` is a plain
`Button` and does **not** close the dialog — `AlertDialogCancel` is the only part
wired to `Close`. Drive it from state:

```tsx
const [pending, setPending] = useState<Row | null>(null);

<AlertDialog open={pending !== null} onOpenChange={(open) => !open && setPending(null)}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Delete “{pending?.name}”?</AlertDialogTitle>
      <AlertDialogDescription>
        This removes the slider and all {pending?.slides_count} of its slides,
        including their image files. This cannot be undone.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction onClick={() => { destroy(pending); setPending(null); }}>
        Delete
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

## Sonner and next-themes

`ui/sonner.tsx` imports `useTheme` from `next-themes` — a plain React package
with no Next.js dependency (the name is historical). `ThemeProvider` and
`Toaster` live **once at the app root** in `resources/js/app.tsx`, not in a
layout: in a layout they remount on every Inertia navigation and drop in-flight
toasts. A pre-paint script in `app.blade.php` applies the stored theme
(`localStorage` key `zk-appearance`) so there is no flash of light.
