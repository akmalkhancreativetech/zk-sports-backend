import { EyeIcon, EyeOffIcon } from 'lucide-react';
import { useState } from 'react';

import { AuthField, type AuthFieldProps } from '@/components/auth/auth-field';
import { Button } from '@/components/ui/button';

type PasswordFieldProps = Omit<AuthFieldProps, 'type' | 'trailing'>;

/** Password input with a reveal toggle. */
export function PasswordField(props: PasswordFieldProps) {
    const [visible, setVisible] = useState(false);
    const Icon = visible ? EyeOffIcon : EyeIcon;

    return (
        <AuthField
            {...props}
            type={visible ? 'text' : 'password'}
            trailing={
                <Button
                    // type="button", or it submits the form it sits in.
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setVisible((current) => !current)}
                    aria-label={visible ? 'Hide password' : 'Show password'}
                    aria-pressed={visible}
                    aria-controls={props.id}
                    className="text-muted-foreground hover:text-foreground"
                >
                    <Icon className="size-4" />
                </Button>
            }
        />
    );
}
