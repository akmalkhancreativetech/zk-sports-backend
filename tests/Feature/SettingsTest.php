<?php

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Inertia\Testing\AssertableInertia;

beforeEach(function () {
    $this->user = User::factory()->create([
        'name' => 'Original Name',
        'email' => 'original@example.test',
    ]);
});

test('guests cannot reach settings', function () {
    $this->get('/admin/settings')->assertRedirect('/login');
});

test('settings exposes the current profile and role', function () {
    $this->actingAs($this->user)
        ->get('/admin/settings')
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('admin/settings/index')
            ->where('profile.name', 'Original Name')
            ->where('profile.email', 'original@example.test')
            ->where('profile.role', 'editor')
            ->where('profile.role_label', 'Editor')
        );
});

test('the profile can be updated', function () {
    $this->actingAs($this->user)
        ->put('/user/profile-information', [
            'name' => 'New Name',
            'email' => 'new@example.test',
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    $this->user->refresh();
    expect($this->user->name)->toBe('New Name');
    expect($this->user->email)->toBe('new@example.test');
});

test('the profile update validates its input', function (array $payload, string $field) {
    $this->actingAs($this->user)
        ->put('/user/profile-information', $payload)
        ->assertSessionHasErrors($field, null, 'updateProfileInformation');
})->with([
    'missing name' => [['name' => '', 'email' => 'a@b.test'], 'name'],
    'invalid email' => [['name' => 'A', 'email' => 'not-an-email'], 'email'],
]);

test('the profile email must stay unique', function () {
    User::factory()->create(['email' => 'taken@example.test']);

    $this->actingAs($this->user)
        ->put('/user/profile-information', [
            'name' => 'New Name',
            'email' => 'taken@example.test',
        ])
        ->assertSessionHasErrors('email', null, 'updateProfileInformation');
});

test('updating the profile cannot change the role', function () {
    $this->actingAs($this->user)
        ->put('/user/profile-information', [
            'name' => 'New Name',
            'email' => 'new@example.test',
            'role' => 'admin',
        ]);

    // Fortify's action force-fills only name and email, so `role` is ignored.
    expect($this->user->refresh()->isAdmin())->toBeFalse();
});

test('the password can be changed', function () {
    $this->actingAs($this->user)
        ->put('/user/password', [
            'current_password' => 'password',
            'password' => 'a-brand-new-password',
            'password_confirmation' => 'a-brand-new-password',
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    expect(Hash::check('a-brand-new-password', $this->user->refresh()->password))->toBeTrue();
});

test('changing the password requires the current one', function () {
    $this->actingAs($this->user)
        ->put('/user/password', [
            'current_password' => 'wrong-password',
            'password' => 'a-brand-new-password',
            'password_confirmation' => 'a-brand-new-password',
        ])
        ->assertSessionHasErrors('current_password', null, 'updatePassword');

    expect(Hash::check('password', $this->user->refresh()->password))->toBeTrue();
});

test('changing the password requires a matching confirmation', function () {
    $this->actingAs($this->user)
        ->put('/user/password', [
            'current_password' => 'password',
            'password' => 'a-brand-new-password',
            'password_confirmation' => 'something-else',
        ])
        ->assertSessionHasErrors('password', null, 'updatePassword');
});

test('fortify flashes a machine key rather than a message', function (string $url, array $payload, string $key) {
    // This is why the settings forms raise their own toasts: there is no
    // human-readable message to surface, so `flash.success` has nothing to show.
    $this->actingAs($this->user)
        ->put($url, $payload)
        ->assertSessionHas('status', $key);
})->with([
    'profile' => [
        '/user/profile-information',
        ['name' => 'New Name', 'email' => 'new@example.test'],
        'profile-information-updated',
    ],
    'password' => [
        '/user/password',
        [
            'current_password' => 'password',
            'password' => 'a-brand-new-password',
            'password_confirmation' => 'a-brand-new-password',
        ],
        'password-updated',
    ],
]);

test('both roles can manage their own account', function (string $role) {
    $user = User::factory()->create(['role' => $role]);

    $this->actingAs($user)->get('/admin/settings')->assertOk();
})->with(['admin', 'editor']);
