import { ChevronsUpDownIcon } from 'lucide-react';
import { type ReactNode, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
    Command,
    CommandEmpty,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export interface ComboboxOption {
    value: string;
    label: string;
    /** Rendered before the label in both the list and the trigger. */
    icon?: ReactNode;
}

interface Props {
    id: string;
    value: string;
    options: ComboboxOption[];
    onChange: (value: string) => void;
    /** Trigger text when nothing matches the current value. */
    placeholder?: string;
    searchPlaceholder?: string;
    emptyMessage?: string;
    /**
     * Cap on rendered results. Lists in the thousands (the icon picker) must
     * not render every match — search narrows them instead.
     */
    limit?: number;
    invalid?: boolean;
}

/**
 * Searchable single-select. Filtering is ours, not cmdk's, so results can be
 * capped: `shouldFilter={false}` turns cmdk's own matching off.
 */
export function Combobox({
    id,
    value,
    options,
    onChange,
    placeholder = 'Select…',
    searchPlaceholder = 'Search…',
    emptyMessage = 'No matches.',
    limit = 100,
    invalid = false,
}: Props) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');

    const selected = options.find((option) => option.value === value);

    const matches = useMemo(() => {
        const needle = search.trim().toLowerCase();

        return needle
            ? options.filter((option) => option.label.toLowerCase().includes(needle))
            : options;
    }, [options, search]);

    const shown = matches.slice(0, limit);

    return (
        <Popover
            open={open}
            onOpenChange={(next) => {
                setOpen(next);

                if (!next) {
                    setSearch('');
                }
            }}
        >
            <PopoverTrigger
                render={
                    <Button
                        id={id}
                        variant="outline"
                        aria-invalid={invalid || undefined}
                        // Reads as a form field, not a button: same border and
                        // padding as Input, which is also h-8.
                        className="w-full justify-between rounded-lg border-input px-2.5 font-normal"
                    />
                }
            >
                <span
                    className={cn(
                        'flex min-w-0 items-center gap-2',
                        !selected && 'text-muted-foreground',
                    )}
                >
                    {selected?.icon}
                    <span className="truncate">{selected?.label ?? placeholder}</span>
                </span>
                <ChevronsUpDownIcon className="size-4 shrink-0 opacity-50" />
            </PopoverTrigger>

            {/* Match the field, but cap it: on a wide screen `--anchor-width`
                is the full column, which makes a list popup absurdly wide. */}
            <PopoverContent
                className="w-(--anchor-width) max-w-96 min-w-56 p-0"
                align="start"
            >
                <Command shouldFilter={false}>
                    <CommandInput
                        autoFocus
                        value={search}
                        onValueChange={setSearch}
                        placeholder={searchPlaceholder}
                    />
                    <CommandList className="max-h-64">
                        {shown.length === 0 && <CommandEmpty>{emptyMessage}</CommandEmpty>}

                        {shown.map((option) => (
                            <CommandItem
                                key={option.value}
                                value={option.value}
                                data-checked={option.value === value}
                                onSelect={() => {
                                    onChange(option.value);
                                    setOpen(false);
                                }}
                            >
                                {option.icon}
                                <span className="truncate">{option.label}</span>
                            </CommandItem>
                        ))}
                    </CommandList>

                    {matches.length > shown.length && (
                        <p className="border-t px-2 py-1.5 text-xs text-muted-foreground">
                            Showing {shown.length} of {matches.length} — keep typing to narrow.
                        </p>
                    )}
                </Command>
            </PopoverContent>
        </Popover>
    );
}
