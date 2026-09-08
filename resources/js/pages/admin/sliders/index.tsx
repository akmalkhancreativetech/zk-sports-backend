import { Link, router } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import {
    EyeIcon,
    EyeOffIcon,
    MoreHorizontalIcon,
    PencilIcon,
    PlusIcon,
    TrashIcon,
} from 'lucide-react';
import { useState } from 'react';

import { DataTable } from '@/components/admin/data-table';
import { ActiveBadge } from '@/components/admin/status-badge';
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
import type { Paginated, SliderListItem, TableFilters } from '@/types/models';

interface Props {
    sliders: Paginated<SliderListItem>;
    filters: TableFilters;
    canDelete: boolean;
}

type BulkAction = 'activate' | 'deactivate' | 'delete';

export default function SlidersIndex({ sliders, filters, canDelete }: Props) {
    const [pendingDelete, setPendingDelete] = useState<SliderListItem | null>(null);
    const [pendingBulkDelete, setPendingBulkDelete] = useState<{
        ids: number[];
        clearSelection: () => void;
    } | null>(null);

    const runBulk = (action: BulkAction, ids: number[], clearSelection: () => void) => {
        router.post(
            routes.sliders.bulk,
            { action, ids },
            { preserveScroll: true, onSuccess: clearSelection },
        );
    };

    const columns: ColumnDef<TableConfig, SliderListItem>[] = [
        {
            accessorKey: 'name',
            header: 'Name',
            meta: { sortKey: 'name' },
            cell: ({ row }) => (
                <Link
                    href={routes.sliders.edit(row.original.id)}
                    className="font-medium hover:underline"
                >
                    {row.original.name}
                </Link>
            ),
        },
        {
            accessorKey: 'key',
            header: 'Key',
            meta: { sortKey: 'key' },
            cell: ({ row }) => (
                <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{row.original.key}</code>
            ),
        },
        {
            accessorKey: 'slides_count',
            header: 'Slides',
            meta: { sortKey: 'slides_count' },
            cell: ({ row }) => <span className="tabular-nums">{row.original.slides_count}</span>,
        },
        {
            accessorKey: 'is_active',
            header: 'Status',
            meta: { sortKey: 'is_active' },
            cell: ({ row }) => <ActiveBadge active={row.original.is_active} />,
        },
        {
            accessorKey: 'updated_at',
            header: 'Updated',
            meta: { sortKey: 'updated_at' },
            cell: ({ row }) =>
                row.original.updated_at ? (
                    <time
                        dateTime={row.original.updated_at}
                        className="text-sm text-muted-foreground"
                    >
                        {new Date(row.original.updated_at).toLocaleDateString()}
                    </time>
                ) : null,
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
                                    <span className="sr-only">Actions for {row.original.name}</span>
                                </Button>
                            }
                        />
                        <DropdownMenuContent className="w-auto min-w-40" align="end">
                            <DropdownMenuItem
                                render={<Link href={routes.sliders.edit(row.original.id)} />}
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
            title="Sliders"
            description="Home hero sliders and their slides."
            actions={
                <LinkButton href={routes.sliders.create}>
                    <PlusIcon className="size-4" />
                    New slider
                </LinkButton>
            }
        >
            <DataTable
                page={sliders}
                filters={filters}
                columns={columns}
                url={routes.sliders.index}
                only={['sliders', 'filters']}
                searchPlaceholder="Search name or key…"
                emptyMessage="No sliders yet. Create one to get started."
                selectFilters={[
                    {
                        key: 'status',
                        label: 'Status',
                        options: [
                            { value: 'active', label: 'Active' },
                            { value: 'inactive', label: 'Inactive' },
                        ],
                    },
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
                            Delete {pendingBulkDelete?.ids.length} sliders?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            This removes every selected slider along with all of their slides and
                            image files. This cannot be undone.
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
                        <AlertDialogTitle>Delete “{pendingDelete?.name}”?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This removes the slider and all {pendingDelete?.slides_count} of its
                            slides, including their image files. This cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                if (pendingDelete) {
                                    router.delete(routes.sliders.destroy(pendingDelete.id), {
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
