import type { ComponentProps, ReactNode } from 'react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export interface AuthFieldProps extends Omit<ComponentProps<typeof Input>, 'id'> {
    id: string;
    label: string;
    error?: string;
    hint?: string;
    /** Right-aligned content on the label row, e.g. a "Forgot password?" link. */
    action?: ReactNode;
    /** Control rendered inside the input's trailing edge, e.g. a reveal toggle. */
    trailing?: ReactNode;
}

/** Label + input + inline error. Keeps every auth page free of this boilerplate. */
export function AuthField({
    id,
    label,
    error,
    hint,
    action,
    trailing,
    className,
    ...input
}: AuthFieldProps) {
    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
                <Label htmlFor={id}>{label}</Label>
                {action}
            </div>

            <div className="relative">
                <Input
                    id={id}
                    name={id}
                    aria-invalid={Boolean(error)}
                    className={cn(trailing && 'pr-10', className)}
                    {...input}
                />
                {trailing && (
                    <div className="absolute inset-y-0 right-1 flex items-center">{trailing}</div>
                )}
            </div>

            {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
            {error && (
                <p role="alert" className="text-sm text-destructive">
                    {error}
                </p>
            )}
        </div>
    );
}
