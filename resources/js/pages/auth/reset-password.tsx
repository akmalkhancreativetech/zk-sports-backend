import { Form, Head } from '@inertiajs/react';

import { AuthField } from '@/components/auth/auth-field';
import { PasswordField } from '@/components/auth/password-field';
import { SubmitButton } from '@/components/auth/submit-button';
import AuthLayout from '@/layouts/auth-layout';
import { routes } from '@/lib/routes';

interface Props {
    email: string;
    token: string;
}

export default function ResetPassword({ email, token }: Props) {
    return (
        <AuthLayout title="Choose a new password" description="This link can only be used once.">
            <Head title="New password" />

            <Form
                action={routes.auth.resetPassword}
                method="post"
                resetOnError={['password', 'password_confirmation']}
                className="flex flex-col gap-5"
            >
                {({ processing, errors }) => (
                    <>
                        {/* Carried from the emailed link, not user-editable. */}
                        <input type="hidden" name="token" value={token} />

                        <AuthField
                            id="email"
                            label="Email"
                            type="email"
                            autoComplete="username"
                            defaultValue={email}
                            error={errors.email}
                            readOnly
                            className="bg-muted/50"
                        />

                        <PasswordField
                            id="password"
                            label="New password"
                            autoComplete="new-password"
                            error={errors.password}
                            hint="At least 8 characters."
                            required
                            autoFocus
                        />

                        <PasswordField
                            id="password_confirmation"
                            label="Confirm new password"
                            autoComplete="new-password"
                            error={errors.password_confirmation}
                            required
                        />

                        <SubmitButton processing={processing} busy="Saving…">
                            Save password
                        </SubmitButton>
                    </>
                )}
            </Form>
        </AuthLayout>
    );
}
