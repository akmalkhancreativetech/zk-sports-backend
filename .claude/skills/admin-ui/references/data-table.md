# Server-driven tables

`@/components/admin/data-table` renders any admin list. Sorting, searching and
pagination are **query-string state pushed through Inertia partial reloads** —
MySQL does the work, the browser only renders. Never fetch a whole table and sort
it client-side.

## TanStack Table v9 — the v8 API is gone

Installed version is **9.x**, a full rewrite. Every tutorial you will find is v8
and will not compile.

| v8 | v9 |
|---|---|
| `useReactTable({...})` | `useTable({ features, columns, data })` |
| `getCoreRowModel: getCoreRowModel()` | core row model is built in; omit it |
| `ColumnDef<TData, TValue>` | `ColumnDef<TFeatures, TData>` — **features first** |
| `declare module` to augment `ColumnMeta` | `columnMeta: {} as {...}` slot in `tableFeatures()` |
| `flexRender(cell.column.columnDef.cell, cell.getContext())` | `<table.FlexRender cell={cell} />` |
| `row.getVisibleCells()` | `row.getAllCells()` unless `columnVisibilityFeature` is on |

The shared feature set lives in `@/lib/table-features`:

```ts
export const tableConfig = tableFeatures({
    columnMeta: {} as { sortKey?: string; align?: 'left' | 'right' },
});
export type TableConfig = typeof tableConfig;
```

It is **deliberately core-only** — no `rowSortingFeature`, no
`columnFilteringFeature`, no `rowPaginationFeature`. Adding them would duplicate
work the database already did and fight the server's ordering.

Generic components must constrain their row type:

```tsx
import type { RowData } from '@tanstack/react-table';
export function DataTable<T extends RowData>({ ... })
```

To check any v9 signature, read the shipped types rather than guessing:

```bash
cat node_modules/@tanstack/react-table/dist/useTable.d.ts
cat node_modules/@tanstack/table-core/dist/helpers/tableFeatures.d.ts
```

## Controller side

```php
private const SORTABLE = ['name', 'key', 'is_active', 'slides_count', 'updated_at'];

public function index(Request $request): Response
{
    Gate::authorize('viewAny', Slider::class);

    $filters = $request->validate([
        'search'    => ['nullable', 'string', 'max:255'],
        'sort'      => ['nullable', 'string', Rule::in(self::SORTABLE)],
        'direction' => ['nullable', 'string', Rule::in(['asc', 'desc'])],
        'per_page'  => ['nullable', 'integer', 'min:5', 'max:100'],
    ]);

    $sort      = $filters['sort'] ?? 'updated_at';
    $direction = $filters['direction'] ?? 'desc';
    $search    = $filters['search'] ?? null;

    $rows = Slider::query()
        ->withCount('slides')
        ->when($search, fn ($q, string $term) => $q->where(
            fn ($w) => $w->where('name', 'like', "%{$term}%")
                         ->orWhere('key', 'like', "%{$term}%")
        ))
        ->orderBy($sort, $direction)
        ->orderBy('id')            // stable pagination when the sort column ties
        ->paginate($filters['per_page'] ?? 15)
        ->withQueryString()
        ->through(fn (Slider $s) => [ /* explicit field list */ ]);

    return Inertia::render('admin/sliders/index', [
        'sliders'   => $rows,
        'filters'   => ['search' => $search, 'sort' => $sort, 'direction' => $direction],
        'canDelete' => $request->user()->can('delete', new Slider),
    ]);
}
```

Rules:

- **`SORTABLE` whitelist is mandatory.** `orderBy($request->sort)` on raw input
  lets a client order by any column. `Rule::in()` rejects it with a validation
  error.
- **Always add a tiebreak `orderBy('id')`.** Without it, rows shuffle between
  pages when the sort column has duplicates and users see the same row twice.
- **`->withQueryString()`** or paginator links lose the filters.
- **`->through()` with an explicit field list.** Never hand a model straight to
  Inertia — it leaks columns and grows silently as the schema does.
- Return the resolved `filters` so the UI reflects state after a reload.

## Page side

```tsx
const columns: ColumnDef<TableConfig, SliderListItem>[] = [
    {
        accessorKey: 'name',
        header: 'Name',
        meta: { sortKey: 'name' },          // presence makes the header sortable
        cell: ({ row }) => (
            <Link href={routes.sliders.edit(row.original.id)} className="font-medium hover:underline">
                {row.original.name}
            </Link>
        ),
    },
    { id: 'actions', header: '', meta: { align: 'right' }, cell: ({ row }) => ... },
];

<DataTable
    page={sliders}
    filters={filters}
    columns={columns}
    url={routes.sliders.index}
    only={['sliders', 'filters']}        // partial reload — keeps the payload small
    searchPlaceholder="Search name or key…"
    emptyMessage="No sliders yet. Create one to get started."
/>
```

- `meta.sortKey` must match a value in the controller's `SORTABLE`.
- `only` must name every prop the table reads, or a reload will blank them.
- Search is debounced 350ms inside `DataTable`; do not add another debounce.
- Reloads use `preserveState`, `preserveScroll` and `replace` so filtering does
  not spam browser history.

## First column and actions

The first column links to the edit page — users click the name, not a distant
icon. Actions go last, right-aligned, icon-only with `sr-only` labels. Gate
destructive actions on a `can*` prop and omit rather than disable.
