import { useForm } from '@inertiajs/react';
import { useState } from 'react';

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
import { SwitchField } from '@/components/admin/switch-field';
import type { EnumOption, Slider, SliderTransition } from '@/types/models';

interface Props {
    slider?: Slider;
    transitions: EnumOption[];
    /** Where to submit; method follows from whether a slider was passed. */
    action: string;
}

function FieldError({ message }: { message?: string }) {
    if (!message) {
        return null;
    }

    return <p className="text-sm text-destructive">{message}</p>;
}

export function SliderForm({ slider, transitions, action }: Props) {
    const { data, setData, post, put, processing, errors, isDirty } = useForm({
        name: slider?.name ?? '',
        key: slider?.key ?? '',
        is_active: slider?.is_active ?? true,
        autoplay: slider?.autoplay ?? true,
        interval_ms: slider?.interval_ms ?? 5000,
        transition: slider?.transition ?? ('slide' as SliderTransition),
    });

    // The key auto-derives from the name until it is edited by hand.
    const [keyLocked, setKeyLocked] = useState(Boolean(slider));

    const submit = (event: React.FormEvent) => {
        event.preventDefault();
        (slider ? put : post)(action, { preserveScroll: true });
    };

    return (
        <form onSubmit={submit} className="flex flex-col gap-6">
            <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                        id="name"
                        value={data.name}
                        onChange={(event) => {
                            const name = event.target.value;
                            setData((current) => ({
                                ...current,
                                name,
                                key: keyLocked
                                    ? current.key
                                    : name
                                          .toLowerCase()
                                          .replace(/[^a-z0-9]+/g, '_')
                                          .replace(/^_+|_+$/g, ''),
                            }));
                        }}
                        placeholder="Home Hero"
                        required
                    />
                    <FieldError message={errors.name} />
                </div>

                <div className="flex flex-col gap-2">
                    <Label htmlFor="key">Key</Label>
                    <Input
                        id="key"
                        value={data.key}
                        onChange={(event) => {
                            setKeyLocked(true);
                            setData('key', event.target.value);
                        }}
                        placeholder="home_hero"
                        required
                    />
                    <p className="text-xs text-muted-foreground">
                        How the public site fetches this slider. Lowercased on save.
                    </p>
                    <FieldError message={errors.key} />
                </div>

                <div className="flex flex-col gap-2">
                    <Label htmlFor="transition">Transition</Label>
                    <Select
                        value={data.transition}
                        onValueChange={(value) => setData('transition', value as SliderTransition)}
                    >
                        <SelectTrigger id="transition">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {transitions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <FieldError message={errors.transition} />
                </div>

                <div className="flex flex-col gap-2">
                    <Label htmlFor="interval_ms">Interval (ms)</Label>
                    <Input
                        id="interval_ms"
                        type="number"
                        min={1000}
                        max={60000}
                        step={500}
                        value={data.interval_ms}
                        onChange={(event) => setData('interval_ms', Number(event.target.value))}
                    />
                    <FieldError message={errors.interval_ms} />
                </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <SwitchField
                    id="is_active"
                    label="Active"
                    description="Inactive sliders are hidden from the public site."
                    checked={data.is_active}
                    onCheckedChange={(checked) => setData('is_active', checked)}
                    tone="success"
                />

                <SwitchField
                    id="autoplay"
                    label="Autoplay"
                    description="Advance slides automatically on the interval above."
                    checked={data.autoplay}
                    onCheckedChange={(checked) => setData('autoplay', checked)}
                    tone="info"
                />
            </div>

            <div className="flex items-center gap-2">
                <Button type="submit" disabled={processing || (Boolean(slider) && !isDirty)}>
                    {processing ? 'Saving…' : slider ? 'Save changes' : 'Create slider'}
                </Button>
            </div>
        </form>
    );
}
