import { useForm } from '@inertiajs/react';

import { AuthField } from '@/components/auth/auth-field';
import { SubmitButton } from '@/components/auth/submit-button';
import { formToasts } from '@/lib/form-feedback';
import { routes } from '@/lib/routes';

interface Props {
    name: string;
    email: string;
}

export function ProfileForm({ name, email }: Props) {
    const { data, setData, put, processing, errors, isDirty } = useForm({ name, email });

    return (
        <form
            onSubmit={(event) => {
                event.preventDefault();
                put(routes.settings.profile, {
                    preserveScroll: true,
                    // Fortify validates with validateWithBag(), so without this
                    // the errors never reach `errors` and the form fails silently.
                    errorBag: 'updateProfileInformation',
                    ...formToasts('Profile updated.'),
                });
            }}
            className="flex flex-col gap-5"
        >
            <div className="grid gap-5 sm:grid-cols-2">
                <AuthField
                    id="name"
                    label="Name"
                    value={data.name}
                    onChange={(event) => setData('name', event.target.value)}
                    error={errors.name}
                    autoComplete="name"
                    required
                />
                <AuthField
                    id="email"
                    label="Email"
                    type="email"
                    value={data.email}
                    onChange={(event) => setData('email', event.target.value)}
                    error={errors.email}
                    autoComplete="email"
                    required
                />
            </div>

            <SubmitButton
                processing={processing}
                disabled={!isDirty}
                busy="Saving…"
                // self-start, or the flex column stretches it to full width.
                className="w-auto self-start"
            >
                Save changes
            </SubmitButton>
        </form>
    );
}
