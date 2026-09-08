import { router, useForm } from '@inertiajs/react';
import { ArrowLeftIcon, PlusIcon, TrashIcon } from 'lucide-react';
import { useState } from 'react';

import { ActiveBadge } from '@/components/admin/status-badge';
import { SwitchField } from '@/components/admin/switch-field';
import { AuthField } from '@/components/auth/auth-field';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import type { ServiceCategoryItem } from '@/types/models';

interface Props {
    categories: ServiceCategoryItem[];
    canDelete: boolean;
}

export default function ServiceCategories({ categories, canDelete }: Props) {
    const [pendingDelete, setPendingDelete] = useState<ServiceCategoryItem | null>(null);

    const form = useForm({ name: '', slug: '', description: '', is_active: true });

    const submit = (event: React.FormEvent) => {
        event.preventDefault();

        form.post(routes.services.categories.store, {
            preserveScroll: true,
            ...formErrorToast(() => form.reset()),
        });
    };

    return (
        <AdminLayout
            title="Service categories"
            description="A flat list — services belong to at most one."
            actions={
                <LinkButton href={routes.services.index} variant="outline">
                    <ArrowLeftIcon className="size-4" />
                    Back to services
                </LinkButton>
            }
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
                        Deleting one leaves its services uncategorised rather than removing them.
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
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Slug</TableHead>
                                        <TableHead className="text-right">Services</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead />
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {categories.map((category) => (
                                        <TableRow key={category.id}>
                                            <TableCell className="font-medium">
                                                {category.name}
                                            </TableCell>
                                            <TableCell>
                                                <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                                                    {category.slug}
                                                </code>
                                            </TableCell>
                                            <TableCell className="text-right tabular-nums">
                                                {category.services_count}
                                            </TableCell>
                                            <TableCell>
                                                <ActiveBadge active={category.is_active} />
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() =>
                                                            router.put(
                                                                routes.services.categories.update(
                                                                    category.id,
                                                                ),
                                                                {
                                                                    name: category.name,
                                                                    slug: category.slug,
                                                                    description:
                                                                        category.description,
                                                                    is_active: !category.is_active,
                                                                },
                                                                { preserveScroll: true },
                                                            )
                                                        }
                                                    >
                                                        {category.is_active
                                                            ? 'Deactivate'
                                                            : 'Activate'}
                                                    </Button>
                                                    {canDelete && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            aria-label={`Delete ${category.name}`}
                                                            onClick={() =>
                                                                setPendingDelete(category)
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
                    )}
                </CardContent>
            </Card>

            <AlertDialog
                open={pendingDelete !== null}
                onOpenChange={(open) => !open && setPendingDelete(null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete “{pendingDelete?.name}”?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Its {pendingDelete?.services_count} service(s) will become
                            uncategorised. The services themselves are kept.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                if (pendingDelete) {
                                    router.delete(
                                        routes.services.categories.destroy(pendingDelete.id),
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
        </AdminLayout>
    );
}
