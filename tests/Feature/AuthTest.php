<?php

use App\Enums\UserRole;
use App\Models\User;

test('login screen renders', function () {
    $this->get('/login')->assertOk();
});

test('user can login and lands on the admin dashboard', function () {
    $user = User::factory()->create(['email' => 'editor@example.test']);

    $this->post('/login', [
        'email' => 'editor@example.test',
        'password' => 'password',
    ])->assertRedirect('/admin');

    $this->assertAuthenticatedAs($user);
});

test('login fails with a bad password', function () {
    User::factory()->create(['email' => 'editor@example.test']);

    $this->post('/login', [
        'email' => 'editor@example.test',
        'password' => 'wrong-password',
    ])->assertSessionHasErrors('email');

    $this->assertGuest();
});

test('guests are redirected from the admin dashboard', function () {
    $this->get('/admin')->assertRedirect('/login');
});

test('admins and editors can access the admin dashboard', function (UserRole $role) {
    $this->actingAs(User::factory()->create(['role' => $role]))
        ->get('/admin')
        ->assertOk();
})->with([
    'admin' => UserRole::Admin,
    'editor' => UserRole::Editor,
]);

test('only admins can manage users', function () {
    expect(User::factory()->admin()->create()->can('manage-users'))->toBeTrue();
    expect(User::factory()->create()->can('manage-users'))->toBeFalse();
});

test('role is cast to the enum', function () {
    expect(User::factory()->create()->role)->toBe(UserRole::Editor);
    expect(User::factory()->admin()->create()->role)->toBe(UserRole::Admin);
});

test('users can logout', function () {
    $this->actingAs(User::factory()->create())
        ->post('/logout')
        ->assertRedirect('/');

    $this->assertGuest();
});
