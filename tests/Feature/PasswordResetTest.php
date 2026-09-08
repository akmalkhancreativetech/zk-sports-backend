<?php

use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Inertia\Testing\AssertableInertia;

beforeEach(fn () => Notification::fake());

/** Request a reset link and return the plaintext token from the notification. */
function resetTokenFor(User $user): string
{
    test()->post('/forgot-password', ['email' => $user->email]);

    $token = '';

    Notification::assertSentTo($user, ResetPassword::class, function ($notification) use (&$token) {
        $token = $notification->token;

        return true;
    });

    return $token;
}

test('the forgot password screen renders', function () {
    $this->get('/forgot-password')
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page->component('auth/forgot-password'));
});

test('a reset link is emailed to a known address', function () {
    $user = User::factory()->create();

    $this->post('/forgot-password', ['email' => $user->email])
        ->assertSessionHasNoErrors();

    Notification::assertSentTo($user, ResetPassword::class);
});

test('the success status reaches the page so the user sees confirmation', function () {
    $user = User::factory()->create();

    // Visit first, so Fortify's `back()` has a previous URL to return to —
    // which is what a browser does.
    $this->get('/forgot-password');

    // Fortify only reports this through `back()->with('status', ...)`, so it has
    // to be a shared Inertia prop or the screen stays silent after submitting.
    $this->followingRedirects()
        ->post('/forgot-password', ['email' => $user->email])
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('auth/forgot-password')
            ->where('status', trans('passwords.sent'))
        );
});

test('an unknown address is rejected without revealing anything else', function () {
    $this->post('/forgot-password', ['email' => 'nobody@example.test'])
        ->assertSessionHasErrors('email');

    Notification::assertNothingSent();
});

test('the reset screen renders with the token and email from the link', function () {
    $user = User::factory()->create();
    $token = resetTokenFor($user);

    $this->get("/reset-password/{$token}?email=".urlencode($user->email))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('auth/reset-password')
            ->where('email', $user->email)
            ->where('token', $token)
        );
});

test('the password can be reset with a valid token', function () {
    $user = User::factory()->create();

    $this->post('/reset-password', [
        'token' => resetTokenFor($user),
        'email' => $user->email,
        'password' => 'new-password-123',
        'password_confirmation' => 'new-password-123',
    ])
        // Assert the redirect, not just "no session errors" — a 500 also has no
        // session errors, which is exactly how the unbound action hid.
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    expect(Hash::check('new-password-123', $user->refresh()->password))->toBeTrue();
});

test('a used token cannot be replayed', function () {
    $user = User::factory()->create();
    $token = resetTokenFor($user);
    $payload = [
        'token' => $token,
        'email' => $user->email,
        'password' => 'new-password-123',
        'password_confirmation' => 'new-password-123',
    ];

    $this->post('/reset-password', $payload)->assertSessionHasNoErrors();
    $this->post('/reset-password', $payload)->assertSessionHasErrors('email');
});

test('a reset is refused with an invalid token', function () {
    $user = User::factory()->create();

    $this->post('/reset-password', [
        'token' => 'not-a-real-token',
        'email' => $user->email,
        'password' => 'new-password-123',
        'password_confirmation' => 'new-password-123',
    ])->assertSessionHasErrors();

    expect(Hash::check('password', $user->refresh()->password))->toBeTrue();
});

test('a reset requires a matching confirmation', function () {
    $user = User::factory()->create();

    // Needs a real token: the broker checks the token before the password rules
    // run, so a bogus token would surface as an `email` error instead.
    $this->post('/reset-password', [
        'token' => resetTokenFor($user),
        'email' => $user->email,
        'password' => 'new-password-123',
        'password_confirmation' => 'different-password',
    ])->assertSessionHasErrors('password');

    expect(Hash::check('password', $user->refresh()->password))->toBeTrue();
});

test('a reset enforces the minimum password length', function () {
    $user = User::factory()->create();

    $this->post('/reset-password', [
        'token' => resetTokenFor($user),
        'email' => $user->email,
        'password' => 'short',
        'password_confirmation' => 'short',
    ])->assertSessionHasErrors('password');
});

test('the confirm password screen renders for a signed-in user', function () {
    $this->actingAs(User::factory()->create())
        ->get('/user/confirm-password')
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page->component('auth/confirm-password'));
});

test('confirming with the correct password succeeds', function () {
    $this->actingAs(User::factory()->create())
        ->post('/user/confirm-password', ['password' => 'password'])
        ->assertSessionHasNoErrors();
});

test('confirming with the wrong password fails', function () {
    $this->actingAs(User::factory()->create())
        ->post('/user/confirm-password', ['password' => 'wrong'])
        ->assertSessionHasErrors('password');
});

test('registration is disabled', function () {
    $this->get('/register')->assertNotFound();
    $this->post('/register', [])->assertNotFound();
});
