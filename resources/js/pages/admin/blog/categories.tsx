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
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { router, useForm } from '@inertiajs/react';
import {
    EyeIcon,
    EyeOffIcon,
    MoreHorizontalIcon,
    PencilIcon,
    PlusIcon,
    RotateCcwIcon,
    TrashIcon,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import { SortableTableRow } from '@/components/admin/sortable-table-row';
import { ActiveBadge } from '@/components/admin/status-badge';
import { SwitchField } from '@/components/admin/switch-field';
import { AuthField } from '@/components/auth/auth-field';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { formErrorToast } from '@/lib/form-feedback';
import { routes } from '@/lib/routes';
import type { BlogCategoryItem, TrashedBlogCategory } from '@/types/models';

interface Props {
    categories: BlogCategoryItem[];
    trashed: TrashedBlogCategory[];
    canDelete: boolean;
    canRestore: boolean;
}

export default function BlogCategories({ categories, trashed, canDelete, canRestore }: Props) {
    const [pendingDelete, setPendingDelete] = useState<BlogCategoryItem | null>(null);
    const [pendingPurge, setPendingPurge] = useState<TrashedBlogCategory | null>(null);
    const [editing, setEditing] = useState<BlogCategoryItem | null>(null);
    /** The row whose active toggle is in flight, so it can show that it is. */
    const [togglingId, setTogglingId] = useState<number | null>(null);

    // Optimistic drag order, re-synced whenever the server sends a new list.
    const [ordered, setOrdered] = useState(categories);

    useEffect(() => setOrdered(categories), [categories]);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (!over || active.id === over.id) {
            return;
        }

        const from = ordered.findIndex((category) => category.id === active.id);
        const to = ordered.findIndex((category) => category.id === over.id);
        const next = arrayMove(ordered, from, to);

        setOrdered(next);

        router.post(
            routes.blog.categories.reorder,
            {
                categories: next.map((category, index) => ({
                    id: category.id,
                    sort_order: index,
                })),
            },
            {
                preserveScroll: true,
                preserveState: true,
                // Roll back to the server's truth if the write failed.
                onError: () => setOrdered(categories),
            },
        );
    };

    const form = useForm({ name: '', slug: '', description: '', is_active: true });

    const submit = (event: React.FormEvent) => {
        event.preventDefault();

        form.post(routes.blog.categories.store, {
            preserveScroll: true,
            ...formErrorToast(() => form.reset()),
        });
    };

    const toggleActive = (category: BlogCategoryItem) => {
        setTogglingId(category.id);

        router.put(
            routes.blog.categories.update(category.id),
            {
                name: category.name,
                slug: category.slug,
                description: category.description,
                is_active: !category.is_active,
            },
            { preserveScroll: true, onFinish: () => setTogglingId(null) },
        );
    };

    const activeCount = categories.filter((category) => category.is_active).length;

    return (
        <AdminLayout
            title="Blog categories"
            description="A flat list — a post belongs to at most one."
        >
            <Card>
                <CardHeader>
                    <CardTitle>Add a category</CardTitle>
                    <CardDescription>The slug derives from the name if left blank.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={submit} className="flex flex-col gap-5">
                        <div className="grid gap-5 sm:grid-cols-2">
                            <AuthField
                                id="name"
                                label="Name"
                                value={form.data.name}
                                error={form.errors.name}
                                required
                                onChange={(event) => form.setData('name', event.target.value)}
                            />
                            <AuthField
                                id="slug"
                                label="Slug"
                                value={form.data.slug}
                                error={form.errors.slug}
                                hint="Optional. Lowercased on save."
                                onChange={(event) => form.setData('slug', event.target.value)}
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                rows={2}
                                maxLength={2000}
                                value={form.data.description}
                                onChange={(event) => form.setData('description', event.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">
                                Optional. Used as the category blurb on the public site.
                            </p>
                            {form.errors.description && (
                                <p role="alert" className="text-sm text-destructive">
                                    {form.errors.description}
                                </p>
                            )}
                        </div>

                        <SwitchField
                            id="is_active"
                            label="Active"
                            checked={form.data.is_active}
                            onCheckedChange={(checked) => form.setData('is_active', checked)}
                            tone="success"
                        />

                        <Button
                            type="submit"
                            disabled={form.processing}
                            className="w-auto self-start"
                        >
                            <PlusIcon className="size-4" />
                            {form.processing ? 'Adding…' : 'Add category'}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Categories</CardTitle>
                    <CardDescription>
                        {categories.length === 0
                            ? 'Deleting one moves it to the trash below.'
                            : `${categories.length} total · ${activeCount} active. Drag a row to change the order the public site uses.`}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {categories.length === 0 ? (
                        <div className="rounded-lg border border-dashed p-8 text-center">
                            <p className="text-sm text-muted-foreground">
                                No categories yet. Add one above.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto rounded-lg border">
                            <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragEnd={handleDragEnd}
                            >
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-10">
                                                <span className="sr-only">Reorder</span>
                                            </TableHead>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Slug</TableHead>
                                            <TableHead className="text-right">Posts</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">
                                                <span className="sr-only">Actions</span>
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        <SortableContext
                                            items={ordered.map((category) => category.id)}
                                            strategy={verticalListSortingStrategy}
                                        >
                                            {ordered.map((category) => (
                                                <SortableTableRow
                                                    key={category.id}
                                                    id={category.id}
                                                    label={category.name}
                                                >
                                                    <TableCell>
                                                        <div className="flex min-w-0 flex-col">
                                                            <span className="truncate font-medium">
                                                                {category.name}
                                                            </span>
                                                            {category.description && (
                                                                <span className="truncate text-xs text-muted-foreground">
                                                                    {category.description}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                                                            {category.slug}
                                                        </code>
                                                    </TableCell>
                                                    <TableCell className="text-right tabular-nums">
                                                        {category.posts_count}
                                                    </TableCell>
                                                    <TableCell>
                                                        <ActiveBadge active={category.is_active} />
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end">
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger
                                                                    render={
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            disabled={
                                                                                togglingId ===
                                                                                category.id
                                                                            }
                                                                        >
                                                                            <MoreHorizontalIcon className="size-4" />
                                                                            <span className="sr-only">
                                                                                Actions for{' '}
                                                                                {category.name}
                                                                            </span>
                                                                        </Button>
                                                                    }
                                                                />
                                                                <DropdownMenuContent
                                                                    className="w-auto min-w-40"
                                                                    align="end"
                                                                >
                                                                    <DropdownMenuItem
                                                                        onClick={() =>
                                                                            setEditing(category)
                                                                        }
                                                                    >
                                                                        <PencilIcon />
                                                                        Edit
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem
                                                                        onClick={() =>
                                                                            toggleActive(category)
                                                                        }
                                                                    >
                                                                        {category.is_active ? (
                                                                            <>
                                                                                <EyeOffIcon />
                                                                                Deactivate
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <EyeIcon />
                                                                                Activate
                                                                            </>
                                                                        )}
                                                                    </DropdownMenuItem>
                                                                    {canDelete && (
                                                                        <DropdownMenuItem
                                                                            variant="destructive"
                                                                            onClick={() =>
                                                                                setPendingDelete(
                                                                                    category,
                                                                                )
                                                                            }
                                                                        >
                                                                            <TrashIcon />
                                                                            Delete
                                                                        </DropdownMenuItem>
                                                                    )}
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </div>
                                                    </TableCell>
                                                </SortableTableRow>
                                            ))}
                                        </SortableContext>
                                    </TableBody>
                                </Table>
                            </DndContext>
                        </div>
                    )}
                </CardContent>
            </Card>

            {trashed.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Trash</CardTitle>
                        <CardDescription>
                            Restore a category to put it back in the list, or delete it for good.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto rounded-lg border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Deleted</TableHead>
                                        <TableHead className="text-right">Posts</TableHead>
                                        <TableHead className="text-right">
                                            <span className="sr-only">Actions</span>
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {trashed.map((category) => (
                                        <TableRow key={category.id}>
                                            <TableCell className="font-medium">
                                                {category.name}
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">
                                                {category.deleted_at
                                                    ? new Date(
                                                          category.deleted_at,
                                                      ).toLocaleDateString()
                                                    : '—'}
                                            </TableCell>
                                            <TableCell className="text-right tabular-nums">
                                                {category.posts_count}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    {canRestore && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() =>
                                                                router.put(
                                                                    routes.blog.categories.restore(
                                                                        category.id,
                                                                    ),
                                                                    {},
                                                                    { preserveScroll: true },
                                                                )
                                                            }
                                                        >
                                                            <RotateCcwIcon className="size-4" />
                                                            Restore
                                                        </Button>
                                                    )}
                                                    {canDelete && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            aria-label={`Permanently delete ${category.name}`}
                                                            onClick={() =>
                                                                setPendingPurge(category)
                                                            }
                                                        >
                                                            <TrashIcon className="size-4 text-destructive" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            )}

            <EditCategoryDialog editing={editing} onClose={() => setEditing(null)} />

            <AlertDialog
                open={pendingDelete !== null}
                onOpenChange={(open) => !open && setPendingDelete(null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete “{pendingDelete?.name}”?</AlertDialogTitle>
                        <AlertDialogDescription>
                            It moves to the trash below, where you can restore it.
                            {pendingDelete && pendingDelete.posts_count > 0
                                ? ` Its ${pendingDelete.posts_count} ${
                                      pendingDelete.posts_count === 1 ? 'post' : 'posts'
                                  } stay attached and become uncategorised only if you delete it for good.`
                                : ''}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                if (pendingDelete) {
                                    router.delete(
                                        routes.blog.categories.destroy(pendingDelete.id),
                                        { preserveScroll: true },
                                    );
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
                            Permanently delete “{pendingPurge?.name}”?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            This cannot be undone.{' '}
                            {pendingPurge && pendingPurge.posts_count > 0
                                ? `Its ${pendingPurge.posts_count} ${
                                      pendingPurge.posts_count === 1 ? 'post' : 'posts'
                                  } become uncategorised — the posts themselves are kept. `
                                : ''}
                            The slug “{pendingPurge?.slug}” becomes free to reuse.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                if (pendingPurge) {
                                    router.delete(
                                        routes.blog.categories.forceDelete(pendingPurge.id),
                                        { preserveScroll: true },
                                    );
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

/**
 * Editing happens in place: the list is short and a category is four fields, so
 * a dialog beats a dedicated page.
 */
function EditCategoryDialog({
    editing,
    onClose,
}: {
    editing: BlogCategoryItem | null;
    onClose: () => void;
}) {
    const form = useForm({ name: '', slug: '', description: '', is_active: true });
    const { setData, clearErrors } = form;

    // Reload the form whenever a different category is opened.
    useEffect(() => {
        if (editing === null) {
            return;
        }

        clearErrors();

        setData({
            name: editing.name,
            slug: editing.slug,
            description: editing.description ?? '',
            is_active: editing.is_active,
        });
    }, [editing]);

    const submit = (event: React.FormEvent) => {
        event.preventDefault();

        if (!editing) {
            return;
        }

        form.put(routes.blog.categories.update(editing.id), {
            preserveScroll: true,
            ...formErrorToast(onClose),
        });
    };

    return (
        <Dialog open={editing !== null} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Edit category</DialogTitle>
                    <DialogDescription>
                        Changing the slug breaks any public link that already uses the old one.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={submit} className="flex flex-col gap-5">
                    <AuthField
                        id="edit_name"
                        label="Name"
                        value={form.data.name}
                        error={form.errors.name}
                        required
                        onChange={(event) => form.setData('name', event.target.value)}
                    />
                    <AuthField
                        id="edit_slug"
                        label="Slug"
                        value={form.data.slug}
                        error={form.errors.slug}
                        hint="Lowercased on save."
                        onChange={(event) => form.setData('slug', event.target.value)}
                    />

                    <div className="flex flex-col gap-2">
                        <Label htmlFor="edit_description">Description</Label>
                        <Textarea
                            id="edit_description"
                            rows={3}
                            maxLength={2000}
                            value={form.data.description}
                            onChange={(event) => form.setData('description', event.target.value)}
                        />
                        {form.errors.description && (
                            <p role="alert" className="text-sm text-destructive">
                                {form.errors.description}
                            </p>
                        )}
                    </div>

                    <SwitchField
                        id="edit_is_active"
                        label="Active"
                        checked={form.data.is_active}
                        onCheckedChange={(checked) => form.setData('is_active', checked)}
                        tone="success"
                    />

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={form.processing}>
                            {form.processing ? 'Saving…' : 'Save changes'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
