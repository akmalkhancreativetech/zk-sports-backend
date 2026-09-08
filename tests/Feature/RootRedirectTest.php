<?php

use App\Models\User;

/*
 * This application is the admin panel only — the public site will be a separate
 * Next.js client against an API. So the root is a signpost, not a page.
 */

test('guests are sent to the login page', function () {
    $this->get('/')->assertRedirect('/login');
});

test('signed-in staff are sent to the dashboard', function () {
    $this->actingAs(User::factory()->create())
        ->get('/')
        ->assertRedirect('/admin');
});

test('the root does not bounce a signed-in user through the login page', function () {
    // GET /login carries Fortify's `guest` middleware, so a blanket redirect to
    // /login would cost an extra hop for authenticated users.
    $this->actingAs(User::factory()->admin()->create())
        ->get('/')
        ->assertRedirect('/admin')
        ->assertHeaderMissing('X-Inertia');
});
