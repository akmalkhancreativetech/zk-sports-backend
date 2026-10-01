import {
    DndContext,
    type DragEndEvent,
    KeyboardSensor,
    PointerSensor,
    closestCenter,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    SortableContext,
    arrayMove,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { router } from '@inertiajs/react';
import { type ColumnDef, type RowData, useTable } from '@tanstack/react-table';
import {
    ArrowDownIcon,
    ArrowUpDownIcon,
    ArrowUpIcon,
    GripVerticalIcon,
    SearchIcon,
    XIcon,
} from 'lucide-react';
import { type ReactNode, useEffect, useRef, useState } from 'react';

import { Combobox } from '@/components/admin/combobox';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { type TableConfig, tableConfig } from '@/lib/table-features';
import type { EnumOption, Paginated, TableFilters } from '@/types/models';

/** A server-side select filter, e.g. status. */
export interface SelectFilter {
    key: string;
    label: string;
    options: EnumOption[];
    /** Renders a searchable combobox instead of a plain select. For long lists. */
    searchable?: boolean;
    /** Wording for the unset option. Defaults to `All {label}`. */
    allLabel?: string;
}

interface DataTableProps<T extends RowData> {
    page: Paginated<T>;
    filters: TableFilters;
    columns: ColumnDef<TableConfig, T>[];
    url: string;
    only: string[];
    searchPlaceholder?: string;
    emptyMessage?: string;
    /** Select filters rendered beside the search box. */
    selectFilters?: SelectFilter[];
    /**
     * Shortest search that triggers a request. Clearing the box always does.
     * Default 4 — anything shorter matches too much to be useful.
     */
    minSearchLength?: number;
    /** Providing this enables row selection. */
    rowId?: (row: T) => number;
    /** Rendered when at least one row is selected. */
    bulkActions?: (ids: number[], clear: () => void) => ReactNode;
    /**
     * Enables drag-reorder of the current page. Called with the page's rows in
     * their new order; the caller persists them. Requires `rowId`.
     */
    onReorder?: (rows: T[]) => void;
    /**
     * Off while a search, filter or sort would make a drop meaningless — the
     * handles disappear rather than silently writing a nonsense order.
     */
    canReorder?: boolean;
    /** Names a row in the drag handle's accessible label. */
    rowLabel?: (row: T) => string;
    /**
     * Rows-per-page choices. Must include the controller's default page size,
     * or the dropdown displays a value it does not offer.
     */
    pageSizeOptions?: number[];
}

const ALL = '__all__';

/**
 * Server-driven table: sorting, searching, filtering and pagination are all
 * query-string state pushed through Inertia partial reloads (plan.md §3.5).
 */
export function DataTable<T extends RowData>({
    page,
    filters,
    columns,
    url,
    only,
    searchPlaceholder = 'Search…',
    emptyMessage = 'Nothing here yet.',
    selectFilters = [],
    minSearchLength = 4,
    rowId,
    bulkActions,
    onReorder,
    canReorder = false,
    rowLabel,
    pageSizeOptions = [10, 15, 25, 50, 100],
}: DataTableProps<T>) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [reloading, setReloading] = useState(false);
    const [selected, setSelected] = useState<number[]>([]);
    const isFirstRender = useRef(true);

    const clearSelection = () => setSelected([]);

    const visit = (params: Record<string, string | number | undefined>) => {
        const current: Record<string, string | undefined> = {};

        for (const filter of selectFilters) {
            current[filter.key] = filters[filter.key] ?? undefined;
        }

        router.get(
            url,
            {
                ...current,
                search: search.length >= minSearchLength ? search : undefined,
                sort: filters.sort,
                direction: filters.direction,
                // Carried on every visit, or sorting/filtering would silently
                // reset the page size the user chose.
                per_page: page.per_page,
                ...params,
            },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
                only,
                // Selection refers to rows that may not survive the reload.
                onStart: () => {
                    setReloading(true);
                    clearSelection();
                },
                onFinish: () => setReloading(false),
            },
        );
    };

    // Debounced, and only once the term is long enough to be worth a query.
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }

        const term = search.trim();

        if (term.length > 0 && term.length < minSearchLength) {
            return;
        }

        const timer = setTimeout(() => {
            visit({ search: term || undefined, page: 1 });
        }, 350);

        return () => clearTimeout(timer);
    }, [search]);

    const toggleSort = (column: string) => {
        const direction =
            filters.sort === column && filters.direction === 'asc' ? 'desc' : 'asc';

        visit({ sort: column, direction, page: 1 });
    };

    const activeFilters =
        (filters.search ? 1 : 0) +
        selectFilters.filter((filter) => filters[filter.key]).length;

    const clearAll = () => {
        setSearch('');
        const cleared: Record<string, undefined> = {};
        for (const filter of selectFilters) {
            cleared[filter.key] = undefined;
        }
        // Sort is a view preference, not a filter — deliberately preserved.
        visit({ ...cleared, search: undefined, page: 1 });
    };

    // Local copy so a drop shows immediately; the server's order wins again as
    // soon as it answers.
    const [data, setData] = useState(page.data);

    useEffect(() => setData(page.data), [page.data]);

    const dragging = Boolean(onReorder && rowId && canReorder);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (!over || active.id === over.id || !rowId || !onReorder) {
            return;
        }

        const from = data.findIndex((row) => rowId(row) === active.id);
        const to = data.findIndex((row) => rowId(row) === over.id);
        const next = arrayMove(data, from, to);

        setData(next);
        onReorder(next);
    };

    const table = useTable({ features: tableConfig, data, columns });

    const rows = table.getRowModel().rows;
    const pageIds = rowId ? data.map(rowId) : [];
    const allOnPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.includes(id));
    const someOnPageSelected = pageIds.some((id) => selected.includes(id));

    const toggleAll = (checked: boolean) =>
        setSelected(checked ? pageIds : []);

    const toggleOne = (id: number, checked: boolean) =>
        setSelected((current) =>
            checked ? [...current, id] : current.filter((value) => value !== id),
        );

    const searchTooShort =
        search.trim().length > 0 && search.trim().length < minSearchLength;

    const columnCount = columns.length + (rowId ? 1 : 0) + (onReorder ? 1 : 0);

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-start gap-2">
                <div className="flex flex-col gap-1">
                    <div className="relative w-full sm:w-72">
                        <SearchIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder={searchPlaceholder}
                            className="pl-9"
                            aria-label={searchPlaceholder}
                        />
                    </div>
                    {searchTooShort && (
                        <p className="text-xs text-muted-foreground">
                            Type at least {minSearchLength} characters to search.
                        </p>
                    )}
                </div>

                {selectFilters.map((filter) => {
                    const allLabel = filter.allLabel ?? `All ${filter.label.toLowerCase()}`;

                    return filter.searchable ? (
                        <div key={filter.key} className="w-40">
                            <Combobox
                                id={`filter-${filter.key}`}
                                value={filters[filter.key] ?? ALL}
                                options={[{ value: ALL, label: allLabel }, ...filter.options]}
                                onChange={(value) =>
                                    visit({
                                        [filter.key]: value === ALL ? undefined : value,
                                        page: 1,
                                    })
                                }
                                searchPlaceholder={`Search ${filter.label.toLowerCase()}…`}
                            />
                        </div>
                    ) : (
                    <Select
                        key={filter.key}
                        value={filters[filter.key] ?? ALL}
                        onValueChange={(value) =>
                            visit({
                                [filter.key]: value === ALL ? undefined : String(value),
                                page: 1,
                            })
                        }
                    >
                        <SelectTrigger className="w-40" aria-label={filter.label}>
                            {/* Base UI renders the raw value unless given a
                                formatter, which would leak the ALL sentinel. */}
                            <SelectValue>
                                {(value) =>
                                    filter.options.find((option) => option.value === value)
                                        ?.label ?? allLabel
                                }
                            </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={ALL}>{allLabel}</SelectItem>
                            {filter.options.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    );
                })}

                {activeFilters > 0 && (
                    <Button variant="ghost" onClick={clearAll}>
                        <XIcon className="size-4" />
                        Clear {activeFilters === 1 ? 'filter' : `${activeFilters} filters`}
                    </Button>
                )}

                {/* ml-auto pins the page size to the right of the toolbar. */}
                <div className="ml-auto flex items-center gap-2">
                    <span className="text-sm whitespace-nowrap text-muted-foreground">
                        Rows per page
                    </span>
                    <Select
                        value={String(page.per_page)}
                        onValueChange={(value) => visit({ per_page: Number(value), page: 1 })}
                    >
                        <SelectTrigger className="w-20" aria-label="Rows per page">
                            <SelectValue>{(value) => String(value)}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                            {pageSizeOptions.map((size) => (
                                <SelectItem key={size} value={String(size)}>
                                    {size}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {rowId && bulkActions && selected.length > 0 && (
                <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/40 p-2 pl-3">
                    <span className="text-sm font-medium">
                        {selected.length} selected
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                        {bulkActions(selected, clearSelection)}
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="ml-auto"
                        onClick={clearSelection}
                    >
                        Clear selection
                    </Button>
                </div>
            )}

            <div className="overflow-x-auto rounded-lg border">
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((group) => (
                            <TableRow key={group.id}>
                                {onReorder && (
                                    <TableHead className="w-10">
                                        <span className="sr-only">Reorder</span>
                                    </TableHead>
                                )}
                                {rowId && (
                                    <TableHead className="w-10">
                                        <Checkbox
                                            checked={allOnPageSelected}
                                            indeterminate={
                                                someOnPageSelected && !allOnPageSelected
                                            }
                                            onCheckedChange={toggleAll}
                                            aria-label="Select all rows on this page"
                                        />
                                    </TableHead>
                                )}
                                {group.headers.map((header) => {
                                    const meta = header.column.columnDef.meta;
                                    const sortKey = meta?.sortKey;
                                    const isSorted = sortKey && filters.sort === sortKey;

                                    return (
                                        <TableHead
                                            key={header.id}
                                            className={
                                                meta?.align === 'right' ? 'text-right' : undefined
                                            }
                                        >
                                            {sortKey ? (
                                                <button
                                                    type="button"
                                                    onClick={() => toggleSort(sortKey)}
                                                    className="-ml-2 inline-flex items-center gap-1 rounded px-2 py-1 font-medium hover:bg-muted"
                                                >
                                                    <table.FlexRender header={header} />
                                                    {isSorted ? (
                                                        filters.direction === 'asc' ? (
                                                            <ArrowUpIcon className="size-3.5" />
                                                        ) : (
                                                            <ArrowDownIcon className="size-3.5" />
                                                        )
                                                    ) : (
                                                        <ArrowUpDownIcon className="size-3.5 opacity-40" />
                                                    )}
                                                </button>
                                            ) : (
                                                <table.FlexRender header={header} />
                                            )}
                                        </TableHead>
                                    );
                                })}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        <SortableContext
                            items={pageIds}
                            strategy={verticalListSortingStrategy}
                        >
                        {reloading ? (
                            Array.from({ length: Math.max(page.data.length, 3) }).map((_, row) => (
                                <TableRow key={`skeleton-${row}`}>
                                    {Array.from({ length: columnCount }).map((_cell, cell) => (
                                        <TableCell key={`skeleton-${row}-${cell}`}>
                                            <Skeleton className="h-5 w-full" />
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : rows.length === 0 ? (
                            <TableRow>
                                <TableCell
                                    colSpan={columnCount}
                                    className="h-28 text-center text-muted-foreground"
                                >
                                    {activeFilters > 0 ? (
                                        <span className="flex flex-col items-center gap-2">
                                            Nothing matches these filters.
                                            <Button variant="outline" size="sm" onClick={clearAll}>
                                                Clear filters
                                            </Button>
                                        </span>
                                    ) : (
                                        emptyMessage
                                    )}
                                </TableCell>
                            </TableRow>
                        ) : (
                            rows.map((row, index) => {
                                const id = rowId ? pageIds[index] : undefined;

                                return (
                                    <DataTableRow
                                        key={row.id}
                                        id={id}
                                        draggable={dragging}
                                        showHandleCell={Boolean(onReorder)}
                                        label={rowLabel ? rowLabel(data[index]) : `row ${id}`}
                                        selected={id !== undefined && selected.includes(id)}
                                    >
                                        {id !== undefined && (
                                            <TableCell className="w-10">
                                                <Checkbox
                                                    checked={selected.includes(id)}
                                                    onCheckedChange={(checked) =>
                                                        toggleOne(id, Boolean(checked))
                                                    }
                                                    aria-label={`Select row ${id}`}
                                                />
                                            </TableCell>
                                        )}
                                        {/* getAllCells, not getVisibleCells — the
                                            latter needs columnVisibilityFeature. */}
                                        {row.getAllCells().map((cell) => (
                                            <TableCell
                                                key={cell.id}
                                                className={
                                                    cell.column.columnDef.meta?.align === 'right'
                                                        ? 'text-right'
                                                        : undefined
                                                }
                                            >
                                                <table.FlexRender cell={cell} />
                                            </TableCell>
                                        ))}
                                    </DataTableRow>
                                );
                            })
                        )}
                        </SortableContext>
                    </TableBody>
                </Table>
                </DndContext>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                    {page.total === 0
                        ? 'No results'
                        : `Showing ${page.from}–${page.to} of ${page.total}`}
                </p>

                <div className="flex flex-wrap items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={!page.prev_page_url}
                        onClick={() => visit({ page: page.current_page - 1 })}
                    >
                        Previous
                    </Button>
                    <span className="text-sm text-muted-foreground">
                        Page {page.current_page} of {page.last_page}
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={!page.next_page_url}
                        onClick={() => visit({ page: page.current_page + 1 })}
                    >
                        Next
                    </Button>
                </div>
            </div>
        </div>
    );
}

/**
 * One body row. It always calls `useSortable` — hooks cannot be conditional —
 * but only wires the handle and transform when dragging is on.
 */
function DataTableRow({
    id,
    draggable,
    showHandleCell,
    label,
    selected,
    children,
}: {
    id: number | undefined;
    draggable: boolean;
    showHandleCell: boolean;
    label: string;
    selected: boolean;
    children: ReactNode;
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: id ?? -1,
        disabled: !draggable,
    });

    return (
        <TableRow
            ref={draggable ? setNodeRef : undefined}
            style={draggable ? { transform: CSS.Transform.toString(transform), transition } : undefined}
            data-state={selected ? 'selected' : undefined}
            className={isDragging ? 'relative z-10 bg-card shadow-lg' : undefined}
        >
            {showHandleCell && (
                <TableCell className="w-10">
                    {draggable && (
                        <button
                            type="button"
                            className="cursor-grab touch-none rounded p-1 text-muted-foreground hover:bg-muted active:cursor-grabbing"
                            aria-label={`Reorder ${label}`}
                            {...attributes}
                            {...listeners}
                        >
                            <GripVerticalIcon className="size-4" />
                        </button>
                    )}
                </TableCell>
            )}
            {children}
        </TableRow>
    );
}
