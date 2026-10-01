import { format } from 'date-fns';
import { CalendarIcon, XIcon } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface Props {
    id: string;
    /**
     * Local "YYYY-MM-DDTHH:mm", or '' for unset — the same string a
     * `datetime-local` input carries, so the server contract is unchanged.
     */
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    invalid?: boolean;
}

const DEFAULT_TIME = '09:00';

/** Local wall-clock string, never UTC: `toISOString` would shift the day. */
function toValue(date: Date, time: string): string {
    return `${format(date, 'yyyy-MM-dd')}T${time}`;
}

function parse(value: string): { date: Date | undefined; time: string } {
    if (!value) {
        return { date: undefined, time: DEFAULT_TIME };
    }

    // "2026-09-08T14:30" parses as local time, which is what was stored.
    const date = new Date(value);

    return Number.isNaN(date.getTime())
        ? { date: undefined, time: DEFAULT_TIME }
        : { date, time: format(date, 'HH:mm') };
}

/**
 * Date and time in one control: a calendar for the day, a time field for the
 * clock. Replaces `<input type="datetime-local">`, whose look and formatting
 * are the browser's rather than the panel's.
 */
export function DateTimePicker({
    id,
    value,
    onChange,
    placeholder = 'Pick a date',
    invalid = false,
}: Props) {
    const [open, setOpen] = useState(false);

    const { date, time } = parse(value);

    return (
        <div className="flex items-center gap-2">
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger
                    render={
                        <Button
                            id={id}
                            variant="outline"
                            aria-invalid={invalid || undefined}
                            // Reads as a form field, not a button: same border
                            // and padding as Input.
                            className="w-full justify-start gap-2 rounded-lg border-input px-2.5 font-normal"
                        />
                    }
                >
                    <CalendarIcon className="size-4 shrink-0 opacity-50" />
                    <span className={cn('truncate', !date && 'text-muted-foreground')}>
                        {date ? format(date, "d MMM yyyy 'at' HH:mm") : placeholder}
                    </span>
                </PopoverTrigger>

                <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        mode="single"
                        selected={date}
                        defaultMonth={date}
                        captionLayout="dropdown"
                        autoFocus
                        onSelect={(selected) => {
                            if (selected) {
                                onChange(toValue(selected, time));
                            }
                        }}
                    />

                    <div className="flex items-center gap-2 border-t p-3">
                        <Label htmlFor={`${id}_time`} className="text-xs text-muted-foreground">
                            Time
                        </Label>
                        <Input
                            id={`${id}_time`}
                            type="time"
                            step={60}
                            value={time}
                            className="w-32"
                            onChange={(event) => {
                                const next = event.target.value || DEFAULT_TIME;

                                // Picking a time before a day implies today.
                                onChange(toValue(date ?? new Date(), next));
                            }}
                        />
                        <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="ml-auto"
                            onClick={() => setOpen(false)}
                        >
                            Done
                        </Button>
                    </div>
                </PopoverContent>
            </Popover>

            {value && (
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Clear the date"
                    onClick={() => onChange('')}
                >
                    <XIcon className="size-4" />
                </Button>
            )}
        </div>
    );
}
