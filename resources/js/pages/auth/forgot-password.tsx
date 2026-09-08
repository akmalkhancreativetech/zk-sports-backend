import { Form, Head, Link } from '@inertiajs/react';

import { AuthField } from '@/components/auth/auth-field';
import { FormStatus } from '@/components/auth/form-status';
import { SubmitButton } from '@/components/auth/submit-button';
import AuthLayout from '@/layouts/auth-layout';
import { routes } from '@/lib/routes';

export default function ForgotPassword({ status }: { status?: string }) {
    return (
        <AuthLayout
            title="Reset your password"
            description="Enter your email and we'll send you a reset link."
            footer={
                <Link href={routes.auth.login} className="underline-offset-4 hover:underline">
                    Back to sign in
                </Link>
            }
        >
            <Head title="Reset password" />
            <FormStatus status={status} />

            <Form
                action={routes.auth.forgotPassword}
                method="post"
                className="flex flex-col gap-5"
            >
                {({ processing, errors }) => (
                    <>
                        <AuthField
                            id="email"
                            label="Email"
                            type="email"
                            autoComplete="username"
                            error={errors.email}
                            required
                            autoFocus
                        />

                        <SubmitButton processing={processing} busy="Sending…">
                            Send reset link
                        </SubmitButton>
                    </>
                )}
            </Form>
        </AuthLayout>
    );
}
