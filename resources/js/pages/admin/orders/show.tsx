import { Link, router, useForm } from '@inertiajs/react';
import { ArrowLeftIcon, PlusIcon, TrashIcon } from 'lucide-react';
import { useState } from 'react';

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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { routes } from '@/lib/routes';
import type {
    EnumOption,
    Order,
    OrderItem,
    OrderItemInput,
    OrderTimelineEntry,
} from '@/types/models';

interface Props {
    order: Order;
    items: OrderItem[];
    timeline: OrderTimelineEntry[];
    allowedTransitions: EnumOption[];
    assignees: EnumOption[];
    canDelete: boolean;
}

const UNASSIGNED = '__unassigned__';

function money(amount: number | string, currency: string): string {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(Number(amount));
}

function fullDate(iso: string | null): string {
    if (!iso) {
        return '—';
    }

    return new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(new Date(iso));
}

/** A read-only field in the customer block. */
function Field({ label, value }: { label: string; value: string | null }) {
    return (
        <div className="flex min-w-0 flex-col gap-1">
            <span className="text-xs text-muted-foreground">{label}</span>
            <span className="truncate text-sm">{value || '—'}</span>
        </div>
    );
}

export default function OrderShow({
    order,
    items,
    timeline,
    allowedTransitions,
    assignees,
    canDelete,
}: Props) {
    const [confirmingDelete, setConfirmingDelete] = useState(false);
    const [targetStatus, setTargetStatus] = useState<string>('');
    const [statusNote, setStatusNote] = useState('');
    const [changingStatus, setChangingStatus] = useState(false);

    const form = useForm<{
        assigned_to: string | null;
        internal_note: string;
        discount: string;
        tax: string;
        items: OrderItemInput[];
    }>({
        assigned_to: order.assigned_to,
        internal_note: order.internal_note ?? '',
        discount: order.discount,
        tax: order.tax,
        items: items.map((item) => ({
            name: item.name,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            options: item.options,
        })),
    });

    /**
     * Display only. The server recalculates from the posted lines on every
     * write (plan.md §7.3) — this is here so staff can see the effect of an
     * edit before saving it, never to be trusted as the total.
     */
    const subtotal = form.data.items.reduce(
        (sum, item) => sum + Number(item.quantity || 0) * Number(item.unit_price || 0),
        0,
    );
    const projectedTotal = Math.max(
        0,
        subtotal - Number(form.data.discount || 0) + Number(form.data.tax || 0),
    );

    const setItem = (index: number, patch: Partial<OrderItemInput>) => {
        form.setData(
            'items',
            form.data.items.map((item, i) => (i === index ? { ...item, ...patch } : item)),
        );
    };

    const addItem = () => {
        form.setData('items', [
            ...form.data.items,
            { name: '', description: null, quantity: 1, unit_price: '0', options: {} },
        ]);
    };

    const removeItem = (index: number) => {
        form.setData(
            'items',
            form.data.items.filter((_, i) => i !== index),
        );
    };

    const save = () => {
        // The select needs a non-empty sentinel for "nobody"; the server wants
        // null. `transform` mutates the form and returns void, so it cannot be
        // chained onto the patch.
        form.transform((data) => ({
            ...data,
            assigned_to: data.assigned_to === UNASSIGNED ? null : data.assigned_to,
        }));

        form.patch(routes.orders.update(order.id), { preserveScroll: true });
    };

    const changeStatus = () => {
        setChangingStatus(true);

        router.post(
            routes.orders.updateStatus(order.id),
            { status: targetStatus, note: statusNote || null },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setTargetStatus('');
                    setStatusNote('');
                },
                onFinish: () => setChangingStatus(false),
            },
        );
    };

    return (
        <AdminLayout
            title={order.order_number}
            description={`Received ${fullDate(order.created_at)} · ${order.source}`}
            actions={
                <div className="flex items-center gap-2">
                    <StatusBadge tone={order.status_tone as StatusTone}>
                        {order.status_label}
                    </StatusBadge>
                    {canDelete && (
                        <Button variant="outline" onClick={() => setConfirmingDelete(true)}>
                            <TrashIcon />
                            Delete
                        </Button>
                    )}
                </div>
            }
        >
            <div>
                <Link
                    href={routes.orders.index}
                    className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
                >
                    <ArrowLeftIcon className="size-4" />
                    All orders
                </Link>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                <div className="flex flex-col gap-6 lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Customer</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-4 sm:grid-cols-2">
                            <Field label="Name" value={order.customer_name} />
                            <Field label="Company" value={order.company} />
                            <Field label="Email" value={order.customer_email} />
                            <Field label="Phone" value={order.customer_phone} />
                            {order.registered_customer && (
                                <Field label="Account" value={order.registered_customer} />
                            )}
                            {order.customer_note && (
                                <div className="sm:col-span-2">
                                    <span className="text-xs text-muted-foreground">
                                        Their note
                                    </span>
                                    <p className="mt-1 text-sm whitespace-pre-wrap">
                                        {order.customer_note}
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex-row items-center justify-between">
                            <CardTitle>Line items</CardTitle>
                            <Button variant="outline" size="sm" onClick={addItem}>
                                <PlusIcon />
                                Add line
                            </Button>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-4">
                            {form.data.items.length === 0 && (
                                <p className="py-6 text-center text-sm text-muted-foreground">
                                    No lines yet. Add one to build the quote.
                                </p>
                            )}

                            {form.data.items.map((item, index) => (
                                <div
                                    key={index}
                                    className="grid gap-3 rounded-lg border p-3 sm:grid-cols-[1fr_6rem_8rem_auto]"
                                >
                                    <div className="flex min-w-0 flex-col gap-1.5">
                                        <Label htmlFor={`item-${index}-name`}>Item</Label>
                                        <Input
                                            id={`item-${index}-name`}
                                            value={item.name}
                                            onChange={(event) =>
                                                setItem(index, { name: event.target.value })
                                            }
                                            placeholder="What was ordered"
                                        />
                                        {form.errors[`items.${index}.name` as keyof typeof form.errors] && (
                                            <p className="text-xs text-destructive">
                                                {form.errors[`items.${index}.name` as keyof typeof form.errors]}
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex flex-col gap-1.5">
                                        <Label htmlFor={`item-${index}-qty`}>Qty</Label>
                                        <Input
                                            id={`item-${index}-qty`}
                                            type="number"
                                            min={1}
                                            className="tabular-nums"
                                            value={item.quantity}
                                            onChange={(event) =>
                                                setItem(index, { quantity: event.target.value })
                                            }
                                        />
                                    </div>

                                    <div className="flex flex-col gap-1.5">
                                        <Label htmlFor={`item-${index}-price`}>Unit price</Label>
                                        <Input
                                            id={`item-${index}-price`}
                                            type="number"
                                            min={0}
                                            step="0.01"
                                            className="tabular-nums"
                                            value={item.unit_price}
                                            onChange={(event) =>
                                                setItem(index, { unit_price: event.target.value })
                                            }
                                        />
                                    </div>

                                    <div className="flex items-end justify-end">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => removeItem(index)}
                                        >
                                            <TrashIcon />
                                            <span className="sr-only">
                                                Remove line {index + 1}
                                            </span>
                                        </Button>
                                    </div>
                                </div>
                            ))}

                            <Separator />

                            <div className="grid gap-3 sm:grid-cols-2">
                                <div className="flex flex-col gap-1.5">
                                    <Label htmlFor="discount">Discount</Label>
                                    <Input
                                        id="discount"
                                        type="number"
                                        min={0}
                                        step="0.01"
                                        className="tabular-nums"
                                        value={form.data.discount}
                                        onChange={(event) =>
                                            form.setData('discount', event.target.value)
                                        }
                                    />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <Label htmlFor="tax">Tax</Label>
                                    <Input
                                        id="tax"
                                        type="number"
                                        min={0}
                                        step="0.01"
                                        className="tabular-nums"
                                        value={form.data.tax}
                                        onChange={(event) => form.setData('tax', event.target.value)}
                                    />
                                </div>
                            </div>

                            <dl className="flex flex-col gap-1 text-sm">
                                <div className="flex justify-between">
                                    <dt className="text-muted-foreground">Subtotal</dt>
                                    <dd className="tabular-nums">
                                        {money(subtotal, order.currency)}
                                    </dd>
                                </div>
                                <div className="flex justify-between font-medium">
                                    <dt>Total</dt>
                                    <dd className="tabular-nums">
                                        {money(projectedTotal, order.currency)}
                                    </dd>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Recalculated on the server when you save.
                                </p>
                            </dl>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Internal note</CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-3">
                            <Label htmlFor="internal_note" className="sr-only">
                                Internal note
                            </Label>
                            <Textarea
                                id="internal_note"
                                rows={4}
                                value={form.data.internal_note}
                                onChange={(event) =>
                                    form.setData('internal_note', event.target.value)
                                }
                                placeholder="Only staff see this."
                            />

                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="assigned_to">Assignee</Label>
                                <Select
                                    value={form.data.assigned_to ?? UNASSIGNED}
                                    onValueChange={(value: string | null) =>
                                        form.setData('assigned_to', value ?? UNASSIGNED)
                                    }
                                >
                                    <SelectTrigger id="assigned_to">
                                        <SelectValue placeholder="Unassigned" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                                        {assignees.map((person) => (
                                            <SelectItem key={person.value} value={person.value}>
                                                {person.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex justify-end">
                                <Button
                                    onClick={save}
                                    disabled={form.processing || !form.isDirty}
                                >
                                    {form.processing ? 'Saving…' : 'Save changes'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="flex flex-col gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Status</CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-3">
                            {order.is_terminal ? (
                                <p className="text-sm text-muted-foreground">
                                    {order.status_label} is a final state — this order cannot move
                                    any further.
                                </p>
                            ) : (
                                <>
                                    <div className="flex flex-col gap-1.5">
                                        <Label htmlFor="status">Move to</Label>
                                        <Select
                                            value={targetStatus}
                                            onValueChange={(value: string | null) =>
                                                setTargetStatus(value ?? '')
                                            }
                                        >
                                            <SelectTrigger id="status">
                                                <SelectValue placeholder="Choose a status" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {allowedTransitions.map((option) => (
                                                    <SelectItem
                                                        key={option.value}
                                                        value={option.value}
                                                    >
                                                        {option.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="flex flex-col gap-1.5">
                                        <Label htmlFor="status_note">Note (optional)</Label>
                                        <Textarea
                                            id="status_note"
                                            rows={2}
                                            value={statusNote}
                                            onChange={(event) => setStatusNote(event.target.value)}
                                            placeholder="Why this changed."
                                        />
                                    </div>

                                    <Button
                                        onClick={changeStatus}
                                        disabled={!targetStatus || changingStatus}
                                    >
                                        {changingStatus ? 'Updating…' : 'Update status'}
                                    </Button>
                                </>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Timeline</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {timeline.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                    Nothing recorded yet.
                                </p>
                            ) : (
                                <ol className="flex flex-col gap-4">
                                    {timeline.map((entry) => (
                                        <li key={entry.id} className="flex flex-col gap-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <StatusBadge
                                                    tone={entry.to_tone as StatusTone}
                                                    showDot={false}
                                                >
                                                    {entry.to_label}
                                                </StatusBadge>
                                                {entry.from_label && (
                                                    <span className="text-xs text-muted-foreground">
                                                        from {entry.from_label}
                                                    </span>
                                                )}
                                            </div>
                                            <span className="text-xs text-muted-foreground">
                                                {fullDate(entry.created_at)}
                                                {entry.user ? ` · ${entry.user}` : ''}
                                            </span>
                                            {entry.note && (
                                                <p className="text-sm whitespace-pre-wrap">
                                                    {entry.note}
                                                </p>
                                            )}
                                        </li>
                                    ))}
                                </ol>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            <AlertDialog open={confirmingDelete} onOpenChange={setConfirmingDelete}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete {order.order_number}?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This removes the order from {order.customer_name}, its{' '}
                            {items.length} line{items.length === 1 ? '' : 's'} and its status
                            history. It can be restored by an administrator.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => router.delete(routes.orders.destroy(order.id))}
                        >
                            Delete order
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </AdminLayout>
    );
}
