import { Loader2Icon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Props {
    processing: boolean;
    children: string;
    /** Label shown while the request is in flight. */
    busy?: string;
    /** Disabled for a reason other than being in flight, e.g. an unchanged form. */
    disabled?: boolean;
    className?: string;
}

export function SubmitButton({ processing, children, busy, disabled, className }: Props) {
    return (
        <Button
            type="submit"
            disabled={processing || disabled}
            className={cn('w-full', className)}
        >
            {processing && <Loader2Icon className="size-4 animate-spin" />}
            {processing ? (busy ?? 'Working…') : children}
        </Button>
    );
}
