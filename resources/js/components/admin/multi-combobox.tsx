import { CheckIcon, ChevronsUpDownIcon, XIcon } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
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
import type { EnumOption } from '@/types/models';

interface Props {
    id: string;
    /** Selected option values. */
    value: string[];
    options: EnumOption[];
    onChange: (value: string[]) => void;
    placeholder?: string;
    searchPlaceholder?: string;
    emptyMessage?: string;
    invalid?: boolean;
}

/**
 * Searchable multi-select. The chosen values also render as removable chips
 * below the trigger, so the selection is readable without opening the list.
 */
export function MultiCombobox({
    id,
    value,
    options,
    onChange,
    placeholder = 'Select…',
    searchPlaceholder = 'Search…',
    emptyMessage = 'No matches.',
    invalid = false,
}: Props) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');

    const selected = options.filter((option) => value.includes(option.value));

    const matches = useMemo(() => {
        const needle = search.trim().toLowerCase();

        return needle
            ? options.filter((option) => option.label.toLowerCase().includes(needle))
            : options;
    }, [options, search]);

    const toggle = (option: string) =>
        onChange(
            value.includes(option)
                ? value.filter((current) => current !== option)
                : [...value, option],
        );

    return (
        <div className="flex flex-col gap-2">
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
                            className="w-full justify-between rounded-lg border-input px-2.5 font-normal"
                        />
                    }
                >
                    <span
                        className={cn(
                            'truncate',
                            selected.length === 0 && 'text-muted-foreground',
                        )}
                    >
                        {selected.length === 0
                            ? placeholder
                            : `${selected.length} selected`}
                    </span>
                    <ChevronsUpDownIcon className="size-4 shrink-0 opacity-50" />
                </PopoverTrigger>

                <PopoverContent className="w-(--anchor-width) max-w-96 min-w-56 p-0" align="start">
                    {/* Filtering is ours so the checked state stays in step. */}
                    <Command shouldFilter={false}>
                        <CommandInput
                            autoFocus
                            value={search}
                            onValueChange={setSearch}
                            placeholder={searchPlaceholder}
                        />
                        <CommandList className="max-h-64">
                            {matches.length === 0 && <CommandEmpty>{emptyMessage}</CommandEmpty>}

                            {matches.map((option) => (
                                <CommandItem
                                    key={option.value}
                                    value={option.value}
                                    // The list stays open: picking several is the point.
                                    onSelect={() => toggle(option.value)}
                                >
                                    <CheckIcon
                                        className={cn(
                                            'size-4',
                                            value.includes(option.value)
                                                ? 'opacity-100'
                                                : 'opacity-0',
                                        )}
                                    />
                                    <span className="truncate">{option.label}</span>
                                </CommandItem>
                            ))}
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>

            {selected.length > 0 && (
                <ul className="flex flex-wrap gap-1">
                    {selected.map((option) => (
                        <li key={option.value}>
                            <Badge variant="secondary" className="gap-1 pr-1">
                                <span className="truncate">{option.label}</span>
                                <button
                                    type="button"
                                    className="rounded-sm p-0.5 hover:bg-muted-foreground/20"
                                    aria-label={`Remove ${option.label}`}
                                    onClick={() => toggle(option.value)}
                                >
                                    <XIcon className="size-3" />
                                </button>
                            </Badge>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
