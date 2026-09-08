import { useForm } from '@inertiajs/react';
import { PlusIcon, TrashIcon } from 'lucide-react';

import { SwitchField } from '@/components/admin/switch-field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { formErrorToast } from '@/lib/form-feedback';
import { routes } from '@/lib/routes';
import type { EnumOption, ServiceOptionInput, ServiceOptionType } from '@/types/models';

interface Props {
    serviceId: number;
    options: ServiceOptionInput[];
    optionTypes: EnumOption[];
}

export function ServiceOptionsEditor({ serviceId, options, optionTypes }: Props) {
    const form = useForm<{ options: ServiceOptionInput[] }>({ options });

    const patchOption = (index: number, patch: Partial<ServiceOptionInput>) =>
        form.setData(
            'options',
            form.data.options.map((option, position) =>
                position === index ? { ...option, ...patch } : option,
            ),
        );

    const addOption = () =>
        form.setData('options', [
            ...form.data.options,
            { name: '', type: 'select', is_required: false, values: [] },
        ]);

    // A div, not a form: this sits inside the service form and nested forms are
    // invalid HTML. It saves to its own endpoint via the button below.
    const save = () =>
        form.put(routes.services.options(serviceId), {
            preserveScroll: true,
            ...formErrorToast(),
        });

    return (
        <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
                What a buyer picks when enquiring — size, colour, printed name. A price adjustment
                is optional and may be negative.
            </p>

            {form.errors.options && (
                <p className="text-sm text-destructive">{form.errors.options}</p>
            )}

            {form.data.options.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-center">
                    <p className="text-sm text-muted-foreground">
                        No options. Buyers will enquire without choosing variants.
                    </p>
                </div>
            ) : (
                <ul className="flex flex-col gap-4">
                    {form.data.options.map((option, index) => (
                        <li key={index} className="flex flex-col gap-4 rounded-lg border p-4">
                            <div className="flex flex-wrap items-end gap-3">
                                <div className="flex min-w-48 flex-1 flex-col gap-1">
                                    <Label htmlFor={`option_name_${index}`}>Option name</Label>
                                    <Input
                                        id={`option_name_${index}`}
                                        value={option.name}
                                        placeholder="Size"
                                        onChange={(event) =>
                                            patchOption(index, { name: event.target.value })
                                        }
                                    />
                                </div>

                                <div className="flex flex-col gap-1">
                                    <Label htmlFor={`option_type_${index}`}>Type</Label>
                                    <Select
                                        value={option.type}
                                        onValueChange={(value) =>
                                            patchOption(index, {
                                                type: value as ServiceOptionType,
                                            })
                                        }
                                    >
                                        <SelectTrigger id={`option_type_${index}`} className="w-48">
                                            <SelectValue>
                                                {(value) =>
                                                    optionTypes.find((t) => t.value === value)
                                                        ?.label ?? 'Choose from a list'
                                                }
                                            </SelectValue>
                                        </SelectTrigger>
                                        <SelectContent>
                                            {optionTypes.map((type) => (
                                                <SelectItem key={type.value} value={type.value}>
                                                    {type.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    aria-label={`Remove option ${index + 1}`}
                                    onClick={() =>
                                        form.setData(
                                            'options',
                                            form.data.options.filter((_, i) => i !== index),
                                        )
                                    }
                                >
                                    <TrashIcon className="size-4 text-destructive" />
                                </Button>
                            </div>

                            {form.errors[`options.${index}.name` as keyof typeof form.errors] && (
                                <p className="text-sm text-destructive">
                                    {form.errors[`options.${index}.name` as keyof typeof form.errors]}
                                </p>
                            )}

                            <SwitchField
                                id={`option_required_${index}`}
                                label="Required"
                                description="The buyer must answer before submitting."
                                checked={option.is_required}
                                onCheckedChange={(checked) =>
                                    patchOption(index, { is_required: checked })
                                }
                                tone="warning"
                            />

                            {option.type === 'select' && (
                                <div className="flex flex-col gap-2">
                                    <Label>Choices</Label>

                                    {form.errors[
                                        `options.${index}.values` as keyof typeof form.errors
                                    ] && (
                                        <p className="text-sm text-destructive">
                                            {
                                                form.errors[
                                                    `options.${index}.values` as keyof typeof form.errors
                                                ]
                                            }
                                        </p>
                                    )}

                                    {option.values.map((value, valueIndex) => (
                                        <div key={valueIndex} className="flex items-center gap-2">
                                            <Input
                                                value={value.label}
                                                placeholder="XL"
                                                aria-label="Choice label"
                                                onChange={(event) =>
                                                    patchOption(index, {
                                                        values: option.values.map((v, i) =>
                                                            i === valueIndex
                                                                ? { ...v, label: event.target.value }
                                                                : v,
                                                        ),
                                                    })
                                                }
                                            />
                                            <Input
                                                type="number"
                                                step="0.01"
                                                className="w-36"
                                                placeholder="± price"
                                                aria-label="Price adjustment"
                                                value={value.price_delta ?? ''}
                                                onChange={(event) =>
                                                    patchOption(index, {
                                                        values: option.values.map((v, i) =>
                                                            i === valueIndex
                                                                ? {
                                                                      ...v,
                                                                      price_delta:
                                                                          event.target.value || null,
                                                                  }
                                                                : v,
                                                        ),
                                                    })
                                                }
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                aria-label={`Remove choice ${valueIndex + 1}`}
                                                onClick={() =>
                                                    patchOption(index, {
                                                        values: option.values.filter(
                                                            (_, i) => i !== valueIndex,
                                                        ),
                                                    })
                                                }
                                            >
                                                <TrashIcon className="size-4 text-destructive" />
                                            </Button>
                                        </div>
                                    ))}

                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="w-auto self-start"
                                        onClick={() =>
                                            patchOption(index, {
                                                values: [
                                                    ...option.values,
                                                    { label: '', price_delta: null },
                                                ],
                                            })
                                        }
                                    >
                                        <PlusIcon className="size-4" />
                                        Add choice
                                    </Button>
                                </div>
                            )}
                        </li>
                    ))}
                </ul>
            )}

            <div className="flex items-center gap-2">
                <Button type="button" variant="outline" onClick={addOption}>
                    <PlusIcon className="size-4" />
                    Add option
                </Button>
                <Button type="button" onClick={save} disabled={form.processing}>
                    {form.processing ? 'Saving…' : 'Save options'}
                </Button>
            </div>
        </div>
    );
}
