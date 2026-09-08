import type { ReactNode } from 'react';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

/**
 * Status pill (plan.md §3.5).
 *
 * Always paired with a text label and a dot, never colour alone — colour on its
 * own fails for colourblind users and disappears in high-contrast mode.
 */
const tones = {
    success: {
        pill: 'border-emerald-600/25 bg-emerald-600/10 text-emerald-700 dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:text-emerald-400',
        dot: 'bg-emerald-600 dark:bg-emerald-400',
    },
    neutral: {
        pill: 'border-border bg-muted text-muted-foreground',
        dot: 'bg-muted-foreground/60',
    },
    info: {
        pill: 'border-blue-600/25 bg-blue-600/10 text-blue-700 dark:border-blue-400/25 dark:bg-blue-400/10 dark:text-blue-400',
        dot: 'bg-blue-600 dark:bg-blue-400',
    },
    warning: {
        pill: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-400',
        dot: 'bg-amber-500 dark:bg-amber-400',
    },
    danger: {
        pill: 'border-destructive/25 bg-destructive/10 text-destructive',
        dot: 'bg-destructive',
    },
} as const;

export type StatusTone = keyof typeof tones;

interface StatusBadgeProps {
    tone: StatusTone;
    children: ReactNode;
    /** Hide the leading dot where the label alone is enough. */
    showDot?: boolean;
    className?: string;
}

export function StatusBadge({ tone, children, showDot = true, className }: StatusBadgeProps) {
    const { pill, dot } = tones[tone];

    return (
        <Badge variant="outline" className={cn('gap-1.5 border', pill, className)}>
            {showDot && (
                <span aria-hidden className={cn('size-1.5 shrink-0 rounded-full', dot)} />
            )}
            {children}
        </Badge>
    );
}

/** The active/inactive pill used across list screens. */
export function ActiveBadge({ active }: { active: boolean }) {
    return (
        <StatusBadge tone={active ? 'success' : 'neutral'}>
            {active ? 'Active' : 'Inactive'}
        </StatusBadge>
    );
}
