import { Link, router } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import {
    EyeIcon,
    EyeOffIcon,
    FolderTreeIcon,
    MoreHorizontalIcon,
    PencilIcon,
    PlusIcon,
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
}

type BulkAction = 'activate' | 'deactivate' | 'feature' | 'unfeature' | 'delete';

export default function ServicesIndex({ services, filters, categories, canDelete }: Props) {
    const [pendingDelete, setPendingDelete] = useState<ServiceListItem | null>(null);
    const [pendingBulkDelete, setPendingBulkDelete] = useState<{
        ids: number[];
        clearSelection: () => void;
    } | null>(null);

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
                    <Link
                        href={routes.services.edit(row.original.id)}
                        className="truncate font-medium hover:underline"
                    >
                        {row.original.title}
                    </Link>
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
                    <ActiveBadge active={row.original.is_active} />
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
                emptyMessage="No services yet. Create one to get started."
                selectFilters={[
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
                    { key: 'category', label: 'Category', options: categories },
                ]}
                rowId={(row) => row.id}
                bulkActions={(ids, clearSelection) => (
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
                                    })
                                }
                            >
                                <TrashIcon className="size-4" />
                                Delete
                            </Button>
                        )}
                    </>
                )}
            />

            <AlertDialog
                open={pendingBulkDelete !== null}
                onOpenChange={(open) => !open && setPendingBulkDelete(null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            Delete {pendingBulkDelete?.ids.length} services?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            These are soft-deleted, so existing orders keep resolving them. They
                            disappear from the public site and this list.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                if (pendingBulkDelete) {
                                    runBulk(
                                        'delete',
                                        pendingBulkDelete.ids,
                                        pendingBulkDelete.clearSelection,
                                    );
                                }
                                setPendingBulkDelete(null);
                            }}
                        >
                            Delete
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
        </AdminLayout>
    );
}
