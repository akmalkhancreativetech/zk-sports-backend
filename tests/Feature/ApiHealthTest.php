<?php

use App\Models\User;

/*
 * Phase 0 of docs/frontend-plan.md. These assertions are less about the health
 * payload than about the wiring underneath it: that routes/api.php is mounted,
 * that the api group is versioned, and — the part that actually breaks a SPA —
 * that an unauthenticated api request answers 401 in JSON instead of
 * redirecting to the login page, which a fetch() cannot follow usefully.
 */

test('the health endpoint reports ok', function () {
    $this->getJson('/api/v1/health')
        ->assertOk()
        ->assertExactJson(['ok' => true]);
});

test('the api is versioned', function () {
    // Guards against an unversioned route sneaking in beside the v1 group.
    $this->getJson('/api/health')->assertNotFound();
});

test('an unauthenticated api request is rejected as json, not redirected', function () {
    $this->getJson('/api/v1/me')->assertUnauthorized();
});

test('a session cookie authenticates an api request', function () {
    // The point of Sanctum's stateful api middleware: no bearer token involved.
    $user = User::factory()->create();

    $this->actingAs($user)
        ->getJson('/api/v1/me')
        ->assertOk()
        ->assertJsonPath('id', $user->id);
});
