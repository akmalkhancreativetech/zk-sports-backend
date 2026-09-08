# Auth flow

Backend is **Laravel Fortify**; every screen is a hand-written Inertia page. This
is a staff-only panel — there are no customer accounts, and the public Next.js
site will submit enquiries anonymously.

## Registration is deliberately off. Never add it.

`Features::registration()` is commented out in `config/fortify.php`. An admin
panel that anyone can sign up for is a security hole. The first users come from
`database/seeders/AdminUserSeeder.php`; further staff are created by an admin.

If asked for a "signup page", say why it is disabled and offer user *invitation*
by an admin instead.

Two live consequences:

- `Fortify::registerView()` in `FortifyServiceProvider` still points at
  `auth/register`, which does not exist. It is unreachable with the feature off —
  harmless, but delete it rather than create the page.
- `POST /register` is not routed. Do not link to it.

## Current feature state

Verify against `config/fortify.php` before relying on this — it drifts.

| Feature | State | Screen needed |
|---|---|---|
| Login | on | `auth/login.tsx` ✅ built |
| Logout | on | `POST /logout` from the user menu |
| Reset passwords | **on** | `auth/forgot-password.tsx`, `auth/reset-password.tsx` |
| Update profile information | on | settings page (not built) |
| Update passwords | on | settings page (not built) |
| Email verification | off | `auth/verify-email.tsx` |
| Two-factor auth | off | `auth/two-factor-challenge.tsx` |
| Passkeys | off (package installed) | — |

**Known gap:** `resetPasswords` is enabled but `forgot-password.tsx` and
`reset-password.tsx` are **0-byte files**, so `/forgot-password` renders a blank
page and a locked-out admin has no way back in. Fix this before adding features.
`verify-email.tsx` and `confirm-password.tsx` are also empty; they are unreachable
while their features are off, but enabling a feature without writing its page
ships a blank screen.

## Screen conventions

All auth pages use `@/layouts/auth-layout` — a centred `Card` on `bg-muted/40`
with a title and optional description. Keep them deliberately plain; polish the
modules first.

```tsx
export default function ForgotPassword({ status }: { status?: string }) {
    return (
        <AuthLayout title="Reset password" description="We'll email you a reset link.">
            <Head title="Reset password" />
            {status && <p className="mb-4 text-sm font-medium text-emerald-600">{status}</p>}
            <Form action={routes.auth.forgotPassword} method="post" className="space-y-4">
                {({ processing, errors }) => ( ... )}
            </Form>
        </AuthLayout>
    );
}
```

Rules for every auth screen:

- **Use Inertia's `<Form>` with a fixed URL from `@/lib/routes`.** Fortify's
  endpoints are fixed strings; confirm with
  `php artisan route:list | grep -Ei 'login|password|two-factor|verif'`.
- **Render Fortify's `status` session value.** Password-reset and verification
  flows communicate success only through it — omit it and the user gets no
  confirmation that the email was sent.
- **`resetOnError={['password']}`** on any form with a password field.
- Correct `autoComplete`: `username`, `current-password`, `new-password`. Wrong
  values make password managers actively hostile.
- Never reveal whether an email exists. Fortify's default messaging is already
  neutral — do not "improve" it.
- Errors render next to the field. On login, Fortify puts credential failures on
  the `email` key.
- No app chrome — no sidebar, no nav. A logged-out user has nowhere to go.

## Named error bags

Fortify's profile and password actions validate with `validateWithBag()`, so
their errors are **not** in the default bag. Omit `errorBag` on the Inertia
request and the form fails silently — no field errors, no toast, nothing.

| Endpoint | Bag |
|---|---|
| `PUT /user/profile-information` | `updateProfileInformation` |
| `PUT /user/password` | `updatePassword` |

```tsx
put(routes.settings.profile, {
    preserveScroll: true,
    errorBag: 'updateProfileInformation',
});
```

Tests must name the bag too:
`assertSessionHasErrors('email', null, 'updateProfileInformation')`.

Login and password-reset use the default bag; only these two are scoped.

## Rate limiting

`fortify:install` does **not** stub the login limiter, and without it every failed
`POST /login` throws `Rate limiter [login] is not defined`. It lives in
`FortifyServiceProvider::boot()`:

```php
RateLimiter::for('login', function (Request $request) {
    $key = Str::transliterate(Str::lower($request->input(Fortify::username())).'|'.$request->ip());
    return Limit::perMinute(5)->by($key);
});
```

Enabling two-factor also requires a `two-factor` limiter. An admin login with no
limiter is a credential-stuffing target from day one.

## Redirects and guards

- `fortify.home` is `/admin`.
- `/` branches on auth: guests to `login`, staff to `admin.dashboard`. A blanket
  redirect to `/login` would cost an extra hop, since `GET /login` carries
  Fortify's `guest:web` middleware and bounces authenticated users onward.
- Admin routes sit behind `['auth', 'can:access-admin']`. The gate admits only
  `admin` and `editor`, so any future role is excluded by default.
- Unauthenticated requests redirect to the `login` named route — keep that name.

## Roles

`users.role` is a `string(20)` column cast to `App\Enums\UserRole` (`admin`,
`editor`). Gates in `AppServiceProvider`:

- `access-admin` — admin + editor. The panel boundary.
- `manage-users` — admin only.

Policies decide per-model: editors get full CRUD on content, only admins delete.
Share the resolved booleans as props (`canDelete`) and hide controls the user
cannot use.

`role` is mass-assignable because the factory needs it. Never write
`$user->update($request->all())` — that is a privilege-escalation path.

## Testing

Pest feature tests only, no browser. Assert Inertia payloads server-side with
`assertInertia`. Cover: screen renders, happy path redirects to `/admin`, bad
credentials produce an `email` error and leave the user a guest, guests are
redirected off admin routes, each role's gate result, and that shared props leak
neither `password` nor `remember_token`.
