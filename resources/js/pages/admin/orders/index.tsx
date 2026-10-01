import { Link, router } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontalIcon, TrashIcon } from 'lucide-react';
import { useState } from 'react';

import { DataTable } from '@/components/admin/data-table';
import { StatusBadge, type StatusTone } from '@/components/admin/status-badge';
import AdminLayout from '@/layouts/admin-layout';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { routes } from '@/lib/routes';
import type { TableConfig } from '@/lib/table-features';
import { cn } from '@/lib/utils';
import type { EnumOption, OrderListItem, Paginated, TableFilters } from '@/types/models';

interface Props {
    orders: Paginated<OrderListItem>;
    filters: TableFilters;
    statusCounts: Record<string, number>;
    statuses: EnumOption[];
    assignees: EnumOption[];
    canDelete: boolean;
}

/** Props the table reads — a partial reload that omits one would blank it. */
const RELOAD_ONLY = ['orders', 'filters', 'statusCounts'];

function money(amount: string, currency: string): string {
    return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency,
        maximumFractionDigits: 0,
    }).format(Number(amount));
}

function shortDate(iso: string | null): string {
    if (!iso) {
        return '—';
    }

    return new Intl.DateTimeFormat(undefined, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    }).format(new Date(iso));
}

export default function OrdersIndex({
    orders,
    filters,
    statusCounts,
    statuses,
    assignees,
    canDelete,
}: Props) {
    const [pendingDelete, setPendingDelete] = useState<OrderListItem | null>(null);

    /**
     * Status lives in its own tab strip rather than the filter row: it is the
     * axis staff actually work along, and the counts belong beside it.
     */
    const selectStatus = (status: string | null) => {
        router.get(
            routes.orders.index,
            { ...filters, status: status ?? undefined, page: undefined },
            { preserveState: true, preserveScroll: true, replace: true, only: RELOAD_ONLY },
        );
    };

    const columns: ColumnDef<TableConfig, OrderListItem>[] = [
        {
            accessorKey: 'order_number',
            header: 'Order',
            meta: { sortKey: 'order_number' },
            cell: ({ row }) => (
                <Link
                    href={routes.orders.show(row.original.id)}
                    className="font-medium tabular-nums hover:underline"
                    prefetch
                >
                    {row.original.order_number}
                </Link>
            ),
        },
        {
            accessorKey: 'customer_name',
            header: 'Customer',
            meta: { sortKey: 'customer_name' },
            cell: ({ row }) => (
                <div className="flex min-w-0 flex-col">
                    <span className="truncate font-medium">{row.original.customer_name}</span>
                    <span className="truncate text-xs text-muted-foreground">
                        {row.original.company ?? row.original.customer_email}
                    </span>
                </div>
            ),
        },
        {
            accessorKey: 'status',
            header: 'Status',
            meta: { sortKey: 'status' },
            cell: ({ row }) => (
                <StatusBadge tone={row.original.status_tone as StatusTone}>
                    {row.original.status_label}
                </StatusBadge>
            ),
        },
        {
            accessorKey: 'items_count',
            header: 'Lines',
            meta: { align: 'right' },
            cell: ({ row }) => <span className="tabular-nums">{row.original.items_count}</span>,
        },
        {
            accessorKey: 'total',
            header: 'Total',
            meta: { sortKey: 'total', align: 'right' },
            cell: ({ row }) => (
                <span className="tabular-nums">
                    {money(row.original.total, row.original.currency)}
                </span>
            ),
        },
        {
            accessorKey: 'assignee',
            header: 'Assignee',
            cell: ({ row }) => (
                <span
                    className={cn(
                        'truncate',
                        !row.original.assignee && 'text-muted-foreground',
                    )}
                >
                    {row.original.assignee ?? 'Unassigned'}
                </span>
            ),
        },
        {
            accessorKey: 'created_at',
            header: 'Received',
            meta: { sortKey: 'created_at' },
            cell: ({ row }) => (
                <span className="tabular-nums text-muted-foreground">
                    {shortDate(row.original.created_at)}
                </span>
            ),
        },
        {
            id: 'actions',
            header: '',
            meta: { align: 'right' },
            cell: ({ row }) =>
                canDelete ? (
                    <DropdownMenu>
                        <DropdownMenuTrigger
                            render={
                                <Button variant="ghost" size="icon">
                                    <MoreHorizontalIcon />
                                    <span className="sr-only">
                                        Actions for {row.original.order_number}
                                    </span>
                                </Button>
                            }
                        />
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem
                                variant="destructive"
                                onClick={() => setPendingDelete(row.original)}
                            >
                                <TrashIcon />
                                Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                ) : null,
        },
    ];

    const tabs = [{ value: null, label: 'All', count: statusCounts.all ?? 0 }, ...statuses.map(
        (status) => ({
            value: status.value,
            label: status.label,
            count: statusCounts[status.value] ?? 0,
        }),
    )];

    return (
        <AdminLayout
            title="Orders"
            description="Enquiries from the website, from first contact through to completion."
        >
            {/* Horizontal scroll on the strip itself, never on the page body. */}
            <div className="-mb-2 overflow-x-auto pb-2">
                <div className="flex w-max gap-1 rounded-lg bg-muted p-1">
                    {tabs.map((tab) => {
                        const active = (filters.status ?? null) === tab.value;

                        return (
                            <button
                                key={tab.value ?? 'all'}
                                type="button"
                                onClick={() => selectStatus(tab.value)}
                                aria-pressed={active}
                                className={cn(
                                    'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors',
                                    'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                                    active
                                        ? 'bg-background text-foreground shadow-sm'
                                        : 'text-muted-foreground hover:text-foreground',
                                )}
                            >
                                {tab.label}
                                <span className="tabular-nums text-xs text-muted-foreground">
                                    {tab.count}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            <DataTable
                page={orders}
                filters={filters}
                columns={columns}
                url={routes.orders.index}
                only={RELOAD_ONLY}
                searchPlaceholder="Search number, name, email or company…"
                emptyMessage={
                    filters.status
                        ? 'No orders in this status.'
                        : 'No orders yet. They arrive here when the website form is submitted.'
                }
                selectFilters={[
                    {
                        key: 'assignee',
                        label: 'Assignee',
                        options: assignees,
                        allLabel: 'Everyone',
                    },
                ]}
                pageSizeOptions={[10, 15, 25, 50, 100]}
            />

            <AlertDialog
                open={pendingDelete !== null}
                onOpenChange={(open) => !open && setPendingDelete(null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            Delete {pendingDelete?.order_number}?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            This removes the order from {pendingDelete?.customer_name}, its{' '}
                            {pendingDelete?.items_count} line
                            {pendingDelete?.items_count === 1 ? '' : 's'} and its status history.
                            It can be restored by an administrator.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                if (pendingDelete) {
                                    router.delete(routes.orders.destroy(pendingDelete.id), {
                                        preserveScroll: true,
                                    });
                                }

                                setPendingDelete(null);
                            }}
                        >
                            Delete order
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </AdminLayout>
    );
}
