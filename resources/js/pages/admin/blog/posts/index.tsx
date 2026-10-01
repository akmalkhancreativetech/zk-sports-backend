import { Link, router } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import {
    EyeIcon,
    EyeOffIcon,
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
import { StatusBadge } from '@/components/admin/status-badge';
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
import type { BlogPostListItem, EnumOption, Paginated, TableFilters } from '@/types/models';

interface Props {
    posts: Paginated<BlogPostListItem>;
    filters: TableFilters;
    categories: EnumOption[];
    canDelete: boolean;
    canRestore: boolean;
}

type BulkAction =
    | 'publish'
    | 'draft'
    | 'feature'
    | 'unfeature'
    | 'delete'
    | 'restore'
    | 'force-delete';

/** Published / Scheduled / Draft, in the one place that decides which it is. */
function PostStatusBadge({ post }: { post: BlogPostListItem }) {
    if (post.status === 'draft') {
        return <StatusBadge tone="neutral">Draft</StatusBadge>;
    }

    return post.is_scheduled ? (
        <StatusBadge tone="warning">Scheduled</StatusBadge>
    ) : (
        <StatusBadge tone="success">Published</StatusBadge>
    );
}

export default function PostsIndex({ posts, filters, categories, canDelete, canRestore }: Props) {
    const [pendingDelete, setPendingDelete] = useState<BlogPostListItem | null>(null);
    /** Set only for a permanent delete, which needs its own, harsher warning. */
    const [pendingPurge, setPendingPurge] = useState<BlogPostListItem | null>(null);
    const [pendingBulkDelete, setPendingBulkDelete] = useState<{
        ids: number[];
        clearSelection: () => void;
        permanent: boolean;
    } | null>(null);

    /** In the trash view every row is deleted, so the actions flip wholesale. */
    const viewingTrash = filters.trashed === 'only';

    const runBulk = (action: BulkAction, ids: number[], clearSelection: () => void) => {
        router.post(
            routes.blog.posts.bulk,
            { action, ids },
            { preserveScroll: true, onSuccess: clearSelection },
        );
    };

    const columns: ColumnDef<TableConfig, BlogPostListItem>[] = [
        {
            accessorKey: 'title',
            header: 'Title',
            meta: { sortKey: 'title' },
            cell: ({ row }) => (
                <div className="flex min-w-0 flex-col">
                    {/* A deleted post has no edit screen to link to. */}
                    {row.original.deleted_at ? (
                        <span className="truncate font-medium">{row.original.title}</span>
                    ) : (
                        <Link
                            href={routes.blog.posts.edit(row.original.id)}
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
            accessorKey: 'author',
            header: 'Author',
            cell: ({ row }) =>
                row.original.author ?? <span className="text-muted-foreground">—</span>,
        },
        {
            accessorKey: 'tags_count',
            header: 'Tags',
            meta: { align: 'right' },
            cell: ({ row }) => <span className="tabular-nums">{row.original.tags_count}</span>,
        },
        {
            accessorKey: 'published_at',
            header: 'Published',
            meta: { sortKey: 'published_at' },
            cell: ({ row }) =>
                row.original.published_at ? (
                    <span className="tabular-nums">
                        {new Date(row.original.published_at).toLocaleDateString()}
                    </span>
                ) : (
                    <span className="text-muted-foreground">—</span>
                ),
        },
        {
            accessorKey: 'status',
            header: 'Status',
            meta: { sortKey: 'status' },
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
                        <PostStatusBadge post={row.original} />
                    )}
                    {row.original.is_featured && (
                        <StatusBadge tone="info" showDot={false}>
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
                                                    routes.blog.posts.restore(row.original.id),
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
                                        render={
                                            <Link href={routes.blog.posts.edit(row.original.id)} />
                                        }
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
            title="Posts"
            description="The blog, newest first."
            actions={
                <LinkButton href={routes.blog.posts.create}>
                    <PlusIcon className="size-4" />
                    New post
                </LinkButton>
            }
        >
            <DataTable
                page={posts}
                filters={filters}
                columns={columns}
                url={routes.blog.posts.index}
                only={['posts', 'filters']}
                searchPlaceholder="Search title or slug…"
                emptyMessage={
                    viewingTrash
                        ? 'Nothing in the trash.'
                        : 'No posts yet. Write one to get started.'
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
                            { value: 'published', label: 'Published' },
                            { value: 'scheduled', label: 'Scheduled' },
                            { value: 'draft', label: 'Draft' },
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
                                onClick={() => runBulk('publish', ids, clearSelection)}
                            >
                                <EyeIcon className="size-4" />
                                Publish
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => runBulk('draft', ids, clearSelection)}
                            >
                                <EyeOffIcon className="size-4" />
                                Move to draft
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
                                ? `Permanently delete ${pendingBulkDelete.ids.length} posts?`
                                : `Delete ${pendingBulkDelete?.ids.length} posts?`}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {pendingBulkDelete?.permanent
                                ? 'This cannot be undone. Their tag links go with them, and the image files are removed from disk.'
                                : 'These move to the trash, where you can restore them. They disappear from the public site and this list.'}
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
                            It moves to the trash, where you can restore it. It disappears from the
                            public site and this list.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                if (pendingDelete) {
                                    router.delete(routes.blog.posts.destroy(pendingDelete.id), {
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
                            This cannot be undone. Its tag links go with it, the image files are
                            removed from disk, and the slug becomes free to reuse.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                if (pendingPurge) {
                                    router.delete(routes.blog.posts.forceDelete(pendingPurge.id), {
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
