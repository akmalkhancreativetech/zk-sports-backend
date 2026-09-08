import { useForm } from '@inertiajs/react';
import { PlusIcon, TrashIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formErrorToast } from '@/lib/form-feedback';
import { routes } from '@/lib/routes';
import type { ServicePriceTierInput } from '@/types/models';

interface Props {
    serviceId: number;
    tiers: ServicePriceTierInput[];
    /** Shown as the fallback when no tier matches. */
    priceFrom: string | null;
    priceUnit: string | null;
}

export function PriceTiersEditor({ serviceId, tiers, priceFrom, priceUnit }: Props) {
    const form = useForm<{ tiers: ServicePriceTierInput[] }>({ tiers });

    const update = (index: number, patch: Partial<ServicePriceTierInput>) =>
        form.setData(
            'tiers',
            form.data.tiers.map((tier, position) =>
                position === index ? { ...tier, ...patch } : tier,
            ),
        );

    const add = () => {
        const last = form.data.tiers.at(-1);
        const nextMin = last?.max_qty ? Number(last.max_qty) + 1 : 1;

        form.setData('tiers', [
            ...form.data.tiers,
            { min_qty: nextMin, max_qty: null, unit_price: '' },
        ]);
    };

    // A div, not a form: this sits inside the service form and nested forms are
    // invalid HTML. It saves to its own endpoint via the button below.
    const save = () =>
        form.put(routes.services.priceTiers(serviceId), {
            preserveScroll: true,
            ...formErrorToast(),
        });

    return (
        <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
                Quantity breaks. A quantity that matches no tier falls back to{' '}
                {priceFrom ? `${priceFrom}${priceUnit ? ` ${priceUnit}` : ''}` : 'on request'}.
                Ranges must not overlap, and only the highest tier can be left open-ended.
            </p>

            {form.errors.tiers && <p className="text-sm text-destructive">{form.errors.tiers}</p>}

            {form.data.tiers.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-center">
                    <p className="text-sm text-muted-foreground">
                        No quantity breaks. Every quantity uses the base price.
                    </p>
                </div>
            ) : (
                <ul className="flex flex-col gap-3">
                    {form.data.tiers.map((tier, index) => {
                        const errorFor = (field: string) =>
                            form.errors[`tiers.${index}.${field}` as keyof typeof form.errors];

                        return (
                            <li key={index} className="flex flex-wrap items-end gap-3 rounded-lg border p-3">
                                <div className="flex flex-col gap-1">
                                    <Label htmlFor={`min_qty_${index}`}>From qty</Label>
                                    <Input
                                        id={`min_qty_${index}`}
                                        type="number"
                                        min={1}
                                        className="w-24"
                                        value={tier.min_qty}
                                        onChange={(event) =>
                                            update(index, { min_qty: event.target.value })
                                        }
                                    />
                                </div>

                                <div className="flex flex-col gap-1">
                                    <Label htmlFor={`max_qty_${index}`}>To qty</Label>
                                    <Input
                                        id={`max_qty_${index}`}
                                        type="number"
                                        min={1}
                                        className="w-24"
                                        placeholder="∞"
                                        value={tier.max_qty ?? ''}
                                        onChange={(event) =>
                                            update(index, {
                                                max_qty: event.target.value || null,
                                            })
                                        }
                                    />
                                </div>

                                <div className="flex flex-col gap-1">
                                    <Label htmlFor={`unit_price_${index}`}>Unit price</Label>
                                    <Input
                                        id={`unit_price_${index}`}
                                        type="number"
                                        step="0.01"
                                        min={0}
                                        className="w-32"
                                        value={tier.unit_price}
                                        onChange={(event) =>
                                            update(index, { unit_price: event.target.value })
                                        }
                                    />
                                </div>

                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    aria-label={`Remove tier ${index + 1}`}
                                    onClick={() =>
                                        form.setData(
                                            'tiers',
                                            form.data.tiers.filter((_, i) => i !== index),
                                        )
                                    }
                                >
                                    <TrashIcon className="size-4 text-destructive" />
                                </Button>

                                {(errorFor('min_qty') || errorFor('max_qty') || errorFor('unit_price')) && (
                                    <p className="w-full text-sm text-destructive">
                                        {errorFor('min_qty') ??
                                            errorFor('max_qty') ??
                                            errorFor('unit_price')}
                                    </p>
                                )}
                            </li>
                        );
                    })}
                </ul>
            )}

            <div className="flex items-center gap-2">
                <Button type="button" variant="outline" onClick={add}>
                    <PlusIcon className="size-4" />
                    Add tier
                </Button>
                <Button type="button" onClick={save} disabled={form.processing}>
                    {form.processing ? 'Saving…' : 'Save tiers'}
                </Button>
            </div>
        </div>
    );
}
