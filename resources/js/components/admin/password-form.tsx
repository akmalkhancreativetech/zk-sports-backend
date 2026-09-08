import { useForm } from '@inertiajs/react';

import { PasswordField } from '@/components/auth/password-field';
import { SubmitButton } from '@/components/auth/submit-button';
import { formToasts } from '@/lib/form-feedback';
import { routes } from '@/lib/routes';

export function PasswordForm() {
    const { data, setData, put, processing, errors, reset } = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    return (
        <form
            onSubmit={(event) => {
                event.preventDefault();
                put(routes.settings.password, {
                    preserveScroll: true,
                    // Fortify scopes these errors to the `updatePassword` bag.
                    errorBag: 'updatePassword',
                    // Clear the fields once accepted — never leave a password
                    // sitting in the DOM after a successful change.
                    ...formToasts('Password updated.', reset),
                });
            }}
            className="flex flex-col gap-5"
        >
            <PasswordField
                id="current_password"
                label="Current password"
                value={data.current_password}
                onChange={(event) => setData('current_password', event.target.value)}
                error={errors.current_password}
                autoComplete="current-password"
                required
            />

            <div className="grid gap-5 sm:grid-cols-2">
                <PasswordField
                    id="password"
                    label="New password"
                    value={data.password}
                    onChange={(event) => setData('password', event.target.value)}
                    error={errors.password}
                    hint="At least 8 characters."
                    autoComplete="new-password"
                    required
                />
                <PasswordField
                    id="password_confirmation"
                    label="Confirm new password"
                    value={data.password_confirmation}
                    onChange={(event) => setData('password_confirmation', event.target.value)}
                    error={errors.password_confirmation}
                    autoComplete="new-password"
                    required
                />
            </div>

            <SubmitButton
                processing={processing}
                busy="Updating…"
                // self-start, or the flex column stretches it to full width.
                className="w-auto self-start"
            >
                Update password
            </SubmitButton>
        </form>
    );
}
