<?php

use App\Enums\UserRole;
use App\Models\User;
use Inertia\Testing\AssertableInertia;

test('dashboard renders the admin dashboard component', function () {
    $this->actingAs(User::factory()->admin()->create())
        ->get('/admin')
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('admin/dashboard')
            ->url('/admin')
        );
});

test('shared props expose the authenticated user with a role', function () {
    $user = User::factory()->admin()->create([
        'name' => 'ZK Sports Admin',
        'email' => 'admin@example.test',
    ]);

    $this->actingAs($user)
        ->get('/admin')
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('auth.user.id', $user->id)
            ->where('auth.user.name', 'ZK Sports Admin')
            ->where('auth.user.email', 'admin@example.test')
            ->where('auth.user.role', 'admin')
        );
});

test('the role enum serialises to its string value for the frontend', function () {
    $this->actingAs(User::factory()->create(['role' => UserRole::Editor]))
        ->get('/admin')
        ->assertInertia(fn (AssertableInertia $page) => $page->where('auth.user.role', 'editor'));
});

test('shared props never leak the password hash or remember token', function () {
    $this->actingAs(User::factory()->admin()->create())
        ->get('/admin')
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->missing('auth.user.password')
            ->missing('auth.user.remember_token')
        );
});

test('sidebar state defaults to open when no cookie is present', function () {
    $this->actingAs(User::factory()->admin()->create())
        ->get('/admin')
        ->assertInertia(fn (AssertableInertia $page) => $page->where('sidebarOpen', true));
});

test('sidebar state is read from the sidebar_state cookie', function (string $cookie, bool $expected) {
    $this->actingAs(User::factory()->admin()->create())
        ->withUnencryptedCookie('sidebar_state', $cookie)
        ->get('/admin')
        ->assertInertia(fn (AssertableInertia $page) => $page->where('sidebarOpen', $expected));
})->with([
    'collapsed' => ['false', false],
    'expanded' => ['true', true],
]);

test('flash messages are shared for the toast bridge', function () {
    $this->actingAs(User::factory()->admin()->create())
        ->withSession(['success' => 'Slider saved.'])
        ->get('/admin')
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('flash.success', 'Slider saved.')
            ->where('flash.error', null)
        );
});

test('the nav order badge count is not shared until the orders module exists', function () {
    $this->actingAs(User::factory()->admin()->create())
        ->get('/admin')
        ->assertInertia(fn (AssertableInertia $page) => $page->missing('newOrdersCount'));
});
