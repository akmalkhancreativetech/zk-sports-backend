import { PasswordForm } from '@/components/admin/password-form';
import { ProfileForm } from '@/components/admin/profile-form';
import AdminLayout from '@/layouts/admin-layout';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
    profile: { name: string; email: string; role: string; role_label: string };
}

export default function Settings({ profile }: Props) {
    return (
        <AdminLayout
            title="Settings"
            description="Your account details and password."
            actions={<Badge variant="outline">{profile.role_label}</Badge>}
        >
            <Card>
                <CardHeader>
                    <CardTitle>Profile</CardTitle>
                    <CardDescription>
                        The name and email used to sign in and attributed to your changes.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ProfileForm name={profile.name} email={profile.email} />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Password</CardTitle>
                    <CardDescription>
                        Changing this signs you out of other browsers.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <PasswordForm />
                </CardContent>
            </Card>
        </AdminLayout>
    );
}
