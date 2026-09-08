import { Form, Head } from '@inertiajs/react';

import { PasswordField } from '@/components/auth/password-field';
import { SubmitButton } from '@/components/auth/submit-button';
import AuthLayout from '@/layouts/auth-layout';
import { routes } from '@/lib/routes';

/** Re-authentication gate in front of a sensitive action. */
export default function ConfirmPassword() {
    return (
        <AuthLayout
            title="Confirm your password"
            description="Please confirm your password before continuing."
        >
            <Head title="Confirm password" />

            <Form
                action={routes.auth.confirmPassword}
                method="post"
                resetOnError={['password']}
                className="flex flex-col gap-5"
            >
                {({ processing, errors }) => (
                    <>
                        <PasswordField
                            id="password"
                            label="Password"
                            autoComplete="current-password"
                            error={errors.password}
                            required
                            autoFocus
                        />

                        <SubmitButton processing={processing} busy="Confirming…">
                            Confirm
                        </SubmitButton>
                    </>
                )}
            </Form>
        </AuthLayout>
    );
}
