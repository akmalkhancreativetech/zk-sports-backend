import { Link, router } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import {
    EyeIcon,
    EyeOffIcon,
    FolderTreeIcon,
    MoreHorizontalIcon,
    PencilIcon,
    PlusIcon,
    RotateCcwIcon,
    StarIcon,
    StarOffIcon,
    TrashIcon,
} from 'lucide-react';
import { useState } from 'react';

import { DataTable } from '@/components/admin/data-table';
import { ActiveBadge, StatusBadge } from '@/components/admin/status-badge';
import { LinkButton } from '@/components/link-button';
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
import type { EnumOption, Paginated, ServiceListItem, TableFilters } from '@/types/models';

interface Props {
    services: Paginated<ServiceListItem>;
    filters: TableFilters;
    categories: EnumOption[];
    canDelete: boolean;
    canRestore: boolean;
}

type BulkAction =
    | 'activate'
    | 'deactivate'
    | 'feature'
    | 'unfeature'
    | 'delete'
    | 'restore'
    | 'force-delete';

export default function ServicesIndex({
    services,
    filters,
    categories,
    canDelete,
    canRestore,
}: Props) {
    const [pendingDelete, setPendingDelete] = useState<ServiceListItem | null>(null);
    /** Set only for a permanent delete, which needs its own, harsher warning. */
    const [pendingPurge, setPendingPurge] = useState<ServiceListItem | null>(null);
    const [pendingBulkDelete, setPendingBulkDelete] = useState<{
        ids: number[];
        clearSelection: () => void;
        permanent: boolean;
    } | null>(null);

    /** In the trash view every row is deleted, so the actions flip wholesale. */
    const viewingTrash = filters.trashed === 'only';

    /**
     * Dragging only makes sense while the list is showing the manual order
     * itself: under a search, a filter or another sort the neighbouring row is
     * not the neighbour in `sort_order`, so a drop would write nonsense.
     */
    const canReorder =
        filters.sort === 'sort_order' &&
        filters.direction === 'asc' &&
        !filters.search &&
        !filters.status &&
        !filters.featured &&
        !filters.category &&
        !filters.trashed;

    /**
     * Permute the page's existing `sort_order` values among its rows, rather
     * than renumbering from the index — that keeps every other page untouched
     * whatever gaps the column has.
     */
    const persistOrder = (rows: ServiceListItem[]) => {
        const slots = rows
            .map((row) => row.sort_order)
            .sort((a, b) => a - b);

        router.post(
            routes.services.reorder,
            {
                services: rows.map((row, index) => ({ id: row.id, sort_order: slots[index] })),
            },
            { preserveScroll: true, preserveState: true, only: ['services', 'filters'] },
        );
    };

    const runBulk = (action: BulkAction, ids: number[], clearSelection: () => void) => {
        router.post(
            routes.services.bulk,
            { action, ids },
            { preserveScroll: true, onSuccess: clearSelection },
        );
    };

    const columns: ColumnDef<TableConfig, ServiceListItem>[] = [
        {
            accessorKey: 'title',
            header: 'Title',
            meta: { sortKey: 'title' },
            cell: ({ row }) => (
                <div className="flex min-w-0 flex-col">
                    {/* A deleted service has no edit screen to link to. */}
                    {row.original.deleted_at ? (
                        <span className="truncate font-medium">{row.original.title}</span>
                    ) : (
                        <Link
                            href={routes.services.edit(row.original.id)}
                            className="truncate font-medium hover:underline"
                        >
                            {row.original.title}
                        </Link>
                    )}
                    <code className="truncate text-xs text-muted-foreground">
                        {row.original.slug}
                    </code>
                </div>
            ),
        },
        {
            accessorKey: 'category',
            header: 'Category',
            cell: ({ row }) =>
                row.original.category ?? (
                    <span className="text-muted-foreground">Uncategorised</span>
                ),
        },
        {
            accessorKey: 'price_from',
            header: 'From',
            meta: { sortKey: 'price_from', align: 'right' },
            cell: ({ row }) =>
                row.original.price_from ? (
                    <span className="tabular-nums">
                        {row.original.price_from}
                        {row.original.price_unit && (
                            <span className="text-muted-foreground">
                                {' '}
                                {row.original.price_unit}
                            </span>
                        )}
                    </span>
                ) : (
                    <span className="text-muted-foreground">On request</span>
                ),
        },
        {
            accessorKey: 'images_count',
            header: 'Gallery',
            meta: { align: 'right' },
            cell: ({ row }) => <span className="tabular-nums">{row.original.images_count}</span>,
        },
        {
            accessorKey: 'is_active',
            header: 'Status',
            meta: { sortKey: 'is_active' },
            cell: ({ row }) => (
                <div className="flex flex-wrap gap-1">
                    {row.original.deleted_at ? (
                        <StatusBadge tone="danger">
                            Deleted{' '}
                            {new Date(row.original.deleted_at).toLocaleDateString(undefined, {
                                day: 'numeric',
                                month: 'short',
                            })}
                        </StatusBadge>
                    ) : (
                        <ActiveBadge active={row.original.is_active} />
                    )}
                    {row.original.is_featured && (
                        <StatusBadge tone="warning" showDot={false}>
                            <StarIcon />
                            Featured
                        </StatusBadge>
                    )}
                </div>
            ),
        },
        {
            id: 'actions',
            header: 'Actions',
            meta: { align: 'right' },
            cell: ({ row }) => (
                <div className="flex justify-end">
                    <DropdownMenu>
                        <DropdownMenuTrigger
                            render={
                                <Button variant="ghost" size="icon">
                                    <MoreHorizontalIcon className="size-4" />
                                    <span className="sr-only">
                                        Actions for {row.original.title}
                                    </span>
                                </Button>
                            }
                        />
                        <DropdownMenuContent className="w-auto min-w-40" align="end">
                            {row.original.deleted_at ? (
                                <>
                                    {canRestore && (
                                        <DropdownMenuItem
                                            onClick={() =>
                                                router.put(
                                                    routes.services.restore(row.original.id),
                                                    {},
                                                    { preserveScroll: true },
                                                )
                                            }
                                        >
                                            <RotateCcwIcon />
                                            Restore
                                        </DropdownMenuItem>
                                    )}
                                    {canDelete && (
                                        <DropdownMenuItem
                                            variant="destructive"
                                            onClick={() => setPendingPurge(row.original)}
                                        >
                                            <TrashIcon />
                                            Delete permanently
                                        </DropdownMenuItem>
                                    )}
                                </>
                            ) : (
                                <>
                                    <DropdownMenuItem
                                        render={<Link href={routes.services.edit(row.original.id)} />}
                                    >
                                        <PencilIcon />
                                        Edit
                                    </DropdownMenuItem>
                                    {canDelete && (
                                        <DropdownMenuItem
                                            variant="destructive"
                                            onClick={() => setPendingDelete(row.original)}
                                        >
                                            <TrashIcon />
                                            Delete
                                        </DropdownMenuItem>
                                    )}
                                </>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            ),
        },
    ];

    return (
        <AdminLayout
            title="Services"
            description="The service catalogue shown on the public site."
            actions={
                <div className="flex items-center gap-2">
                    <LinkButton href={routes.services.categories.index} variant="outline">
                        <FolderTreeIcon className="size-4" />
                        Categories
                    </LinkButton>
                    <LinkButton href={routes.services.create}>
                        <PlusIcon className="size-4" />
                        New service
                    </LinkButton>
                </div>
            }
        >
            <DataTable
                page={services}
                filters={filters}
                columns={columns}
                url={routes.services.index}
                only={['services', 'filters']}
                searchPlaceholder="Search title or slug…"
                emptyMessage={
                    viewingTrash
                        ? 'Nothing in the trash.'
                        : 'No services yet. Create one to get started.'
                }
                selectFilters={[
                    {
                        key: 'trashed',
                        label: 'Deleted',
                        allLabel: 'Not deleted',
                        options: [
                            { value: 'only', label: 'Trash only' },
                            { value: 'with', label: 'Include deleted' },
                        ],
                    },
                    {
                        key: 'status',
                        label: 'Status',
                        options: [
                            { value: 'active', label: 'Active' },
                            { value: 'inactive', label: 'Inactive' },
                        ],
                    },
                    {
                        key: 'featured',
                        label: 'Featured',
                        options: [
                            { value: 'yes', label: 'Featured' },
                            { value: 'no', label: 'Not featured' },
                        ],
                    },
                    {
                        key: 'category',
                        label: 'Category',
                        options: categories,
                        searchable: true,
                    },
                ]}
                rowId={(row) => row.id}
                onReorder={persistOrder}
                canReorder={canReorder}
                rowLabel={(row) => row.title}
                bulkActions={(ids, clearSelection) =>
                    viewingTrash ? (
                        <>
                            {canRestore && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => runBulk('restore', ids, clearSelection)}
                                >
                                    <RotateCcwIcon className="size-4" />
                                    Restore
                                </Button>
                            )}
                            {canDelete && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-destructive"
                                    onClick={() =>
                                        setPendingBulkDelete({
                                            ids,
                                            clearSelection,
                                            permanent: true,
                                        })
                                    }
                                >
                                    <TrashIcon className="size-4" />
                                    Delete permanently
                                </Button>
                            )}
                        </>
                    ) : (
                    <>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => runBulk('activate', ids, clearSelection)}
                        >
                            <EyeIcon className="size-4" />
                            Activate
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => runBulk('deactivate', ids, clearSelection)}
                        >
                            <EyeOffIcon className="size-4" />
                            Deactivate
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => runBulk('feature', ids, clearSelection)}
                        >
                            <StarIcon className="size-4" />
                            Feature
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => runBulk('unfeature', ids, clearSelection)}
                        >
                            <StarOffIcon className="size-4" />
                            Unfeature
                        </Button>
                        {canDelete && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="text-destructive"
                                onClick={() =>
                                    setPendingBulkDelete({
                                        ids,
                                        clearSelection,
                                        permanent: false,
                                    })
                                }
                            >
                                <TrashIcon className="size-4" />
                                Delete
                            </Button>
                        )}
                    </>
                    )
                }
            />

            <AlertDialog
                open={pendingBulkDelete !== null}
                onOpenChange={(open) => !open && setPendingBulkDelete(null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {pendingBulkDelete?.permanent
                                ? `Permanently delete ${pendingBulkDelete.ids.length} services?`
                                : `Delete ${pendingBulkDelete?.ids.length} services?`}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {pendingBulkDelete?.permanent
                                ? 'This cannot be undone. Their galleries, options and price tiers go with them, and the image files are removed from disk.'
                                : 'These are soft-deleted, so existing orders keep resolving them. They disappear from the public site and this list.'}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                if (pendingBulkDelete) {
                                    runBulk(
                                        pendingBulkDelete.permanent ? 'force-delete' : 'delete',
                                        pendingBulkDelete.ids,
                                        pendingBulkDelete.clearSelection,
                                    );
                                }
                                setPendingBulkDelete(null);
                            }}
                        >
                            {pendingBulkDelete?.permanent ? 'Delete permanently' : 'Delete'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog
                open={pendingDelete !== null}
                onOpenChange={(open) => !open && setPendingDelete(null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete “{pendingDelete?.title}”?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This is soft-deleted, so existing orders keep resolving it. It
                            disappears from the public site and this list.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                if (pendingDelete) {
                                    router.delete(routes.services.destroy(pendingDelete.id), {
                                        preserveScroll: true,
                                    });
                                }
                                setPendingDelete(null);
                            }}
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog
                open={pendingPurge !== null}
                onOpenChange={(open) => !open && setPendingPurge(null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            Permanently delete “{pendingPurge?.title}”?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            This cannot be undone. Its {pendingPurge?.images_count} gallery{' '}
                            {pendingPurge?.images_count === 1 ? 'image' : 'images'}, options and
                            price tiers go with it, and the image files are removed from disk.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                if (pendingPurge) {
                                    router.delete(routes.services.forceDelete(pendingPurge.id), {
                                        preserveScroll: true,
                                    });
                                }
                                setPendingPurge(null);
                            }}
                        >
                            Delete permanently
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </AdminLayout>
    );
}
