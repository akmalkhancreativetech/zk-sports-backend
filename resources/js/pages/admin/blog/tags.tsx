import { router, useForm } from '@inertiajs/react';
import { PencilIcon, PlusIcon, TrashIcon } from 'lucide-react';
import { useEffect, useState } from 'react';

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
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { formErrorToast } from '@/lib/form-feedback';
import { routes } from '@/lib/routes';
import type { BlogTagItem } from '@/types/models';

interface Props {
    tags: BlogTagItem[];
    canDelete: boolean;
}

export default function BlogTags({ tags, canDelete }: Props) {
    const [pendingDelete, setPendingDelete] = useState<BlogTagItem | null>(null);
    const [editing, setEditing] = useState<BlogTagItem | null>(null);

    const form = useForm({ name: '', slug: '' });

    const submit = (event: React.FormEvent) => {
        event.preventDefault();

        form.post(routes.blog.tags.store, {
            preserveScroll: true,
            ...formErrorToast(() => form.reset()),
        });
    };

    return (
        <AdminLayout
            title="Blog tags"
            description="Free-form labels — a post can carry as many as it needs."
        >
            <Card>
                <CardHeader>
                    <CardTitle>Add a tag</CardTitle>
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

                        <Button
                            type="submit"
                            disabled={form.processing}
                            className="w-auto self-start"
                        >
                            <PlusIcon className="size-4" />
                            {form.processing ? 'Adding…' : 'Add tag'}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Tags</CardTitle>
                    <CardDescription>
                        {tags.length === 0
                            ? 'Deleting a tag removes it from every post that carries it.'
                            : `${tags.length} in use, listed alphabetically. Deleting one removes it from every post that carries it.`}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {tags.length === 0 ? (
                        <div className="rounded-lg border border-dashed p-8 text-center">
                            <p className="text-sm text-muted-foreground">
                                No tags yet. Add one above.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto rounded-lg border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Slug</TableHead>
                                        <TableHead className="text-right">Posts</TableHead>
                                        <TableHead className="text-right">
                                            <span className="sr-only">Actions</span>
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {tags.map((tag) => (
                                        <TableRow key={tag.id}>
                                            <TableCell className="font-medium">{tag.name}</TableCell>
                                            <TableCell>
                                                <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                                                    {tag.slug}
                                                </code>
                                            </TableCell>
                                            <TableCell className="text-right tabular-nums">
                                                {tag.posts_count}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        aria-label={`Edit ${tag.name}`}
                                                        onClick={() => setEditing(tag)}
                                                    >
                                                        <PencilIcon className="size-4" />
                                                    </Button>
                                                    {canDelete && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            aria-label={`Delete ${tag.name}`}
                                                            onClick={() => setPendingDelete(tag)}
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
                    )}
                </CardContent>
            </Card>

            <EditTagDialog editing={editing} onClose={() => setEditing(null)} />

            <AlertDialog
                open={pendingDelete !== null}
                onOpenChange={(open) => !open && setPendingDelete(null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete “{pendingDelete?.name}”?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This cannot be undone. Tags have no trash.{' '}
                            {pendingDelete && pendingDelete.posts_count > 0
                                ? `The ${pendingDelete.posts_count} ${
                                      pendingDelete.posts_count === 1 ? 'post' : 'posts'
                                  } carrying it are kept — they simply lose this label.`
                                : 'No post carries it.'}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                if (pendingDelete) {
                                    router.delete(routes.blog.tags.destroy(pendingDelete.id), {
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

function EditTagDialog({
    editing,
    onClose,
}: {
    editing: BlogTagItem | null;
    onClose: () => void;
}) {
    const form = useForm({ name: '', slug: '' });
    const { setData, clearErrors } = form;

    useEffect(() => {
        if (editing === null) {
            return;
        }

        clearErrors();
        setData({ name: editing.name, slug: editing.slug });
    }, [editing]);

    const submit = (event: React.FormEvent) => {
        event.preventDefault();

        if (!editing) {
            return;
        }

        form.put(routes.blog.tags.update(editing.id), {
            preserveScroll: true,
            ...formErrorToast(onClose),
        });
    };

    return (
        <Dialog open={editing !== null} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Edit tag</DialogTitle>
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
