import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

/**
 * Track colour by meaning, not decoration: green reads as live/on-air, blue as a
 * behaviour option, amber as something that needs attention.
 */
const tones = {
    primary: '',
    success: 'data-checked:bg-emerald-600 dark:data-checked:bg-emerald-500',
    info: 'data-checked:bg-blue-600 dark:data-checked:bg-blue-500',
    warning: 'data-checked:bg-amber-500 dark:data-checked:bg-amber-400',
} as const;

interface SwitchFieldProps {
    id: string;
    label: string;
    description?: string;
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
    tone?: keyof typeof tones;
}

export function SwitchField({
    id,
    label,
    description,
    checked,
    onCheckedChange,
    tone = 'primary',
}: SwitchFieldProps) {
    return (
        <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
            <div className="min-w-0">
                <Label htmlFor={id} className="font-medium">
                    {label}
                </Label>
                {description && (
                    <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
                )}
            </div>
            <Switch
                id={id}
                checked={checked}
                onCheckedChange={onCheckedChange}
                className={cn('shrink-0', tones[tone])}
            />
        </div>
    );
}
