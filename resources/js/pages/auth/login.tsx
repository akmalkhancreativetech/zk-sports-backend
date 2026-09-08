import { Form, Head, Link } from '@inertiajs/react';

import { AuthField } from '@/components/auth/auth-field';
import { FormStatus } from '@/components/auth/form-status';
import { PasswordField } from '@/components/auth/password-field';
import { SubmitButton } from '@/components/auth/submit-button';
import AuthLayout from '@/layouts/auth-layout';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { routes } from '@/lib/routes';

export default function Login({ status }: { status?: string }) {
    return (
        <AuthLayout title="Sign in" description="Use your staff account to continue.">
            <Head title="Sign in" />
            <FormStatus status={status} />

            <Form
                action={routes.auth.login}
                method="post"
                resetOnError={['password']}
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

                        <PasswordField
                            id="password"
                            label="Password"
                            autoComplete="current-password"
                            error={errors.password}
                            required
                            action={
                                <Link
                                    href={routes.auth.forgotPassword}
                                    className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                                >
                                    Forgot password?
                                </Link>
                            }
                        />

                        <div className="flex items-center gap-2">
                            <Checkbox id="remember" name="remember" value="1" />
                            <Label htmlFor="remember" className="font-normal">
                                Remember me for 30 days
                            </Label>
                        </div>

                        <SubmitButton processing={processing} busy="Signing in…">
                            Sign in
                        </SubmitButton>
                    </>
                )}
            </Form>
        </AuthLayout>
    );
}
