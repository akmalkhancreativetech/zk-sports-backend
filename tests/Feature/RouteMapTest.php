<?php

use Illuminate\Support\Facades\Route;

/*
 * The guardrail plan.md §2.2 calls "not optional".
 *
 * With no Wayfinder and no Ziggy, `resources/js/lib/routes.ts` is a hand-written
 * map of URLs. Nothing but this test stops it drifting from the real routes, and
 * a wrong string is a runtime 404 rather than a build error.
 *
 * URLs for modules that are not built yet are listed in PLANNED below. Delete an
 * entry as its module ships — the test fails if a PLANNED path starts resolving,
 * so the list cannot silently rot either.
 */

const ROUTE_MAP = 'resources/js/lib/routes.ts';

/** Paths declared in routes.ts whose module has not been built yet. */
const PLANNED = [
    '/admin/blog/posts',
    '/admin/blog/categories',
    '/admin/blog/tags',
    '/admin/orders',
    '/admin/orders/{}',
    '/admin/orders/{}/status',
];

/**
 * Every URL literal in routes.ts, with interpolations normalised to `{}`.
 *
 * @return array<int, string>
 */
function declaredPaths(): array
{
    $source = file_get_contents(base_path(ROUTE_MAP));

    // Plain string literals: '/admin/sliders'
    preg_match_all("/'(\/[^']*)'/", $source, $plain);

    // Template literals: `/admin/sliders/${id}/edit`
    preg_match_all('/`(\/[^`]*)`/', $source, $templates);

    $paths = [
        ...$plain[1],
        ...array_map(
            fn (string $path) => preg_replace('/\$\{[^}]+\}/', '{}', $path),
            $templates[1],
        ),
    ];

    return array_values(array_unique($paths));
}

/**
 * Every registered route URI, with parameters normalised to `{}`.
 *
 * @return array<int, string>
 */
function registeredPaths(): array
{
    return collect(Route::getRoutes()->getRoutes())
        ->map(fn ($route) => '/'.ltrim(preg_replace('/\{[^}]+\}/', '{}', $route->uri()), '/'))
        ->unique()
        ->values()
        ->all();
}

test('routes.ts is not empty and parses', function () {
    expect(declaredPaths())->not->toBeEmpty();
});

test('every declared url resolves to a real route', function () {
    $registered = registeredPaths();

    $missing = array_values(array_filter(
        declaredPaths(),
        fn (string $path) => ! in_array($path, PLANNED, true)
            && ! in_array($path, $registered, true),
    ));

    expect($missing)->toBe([], sprintf(
        "These urls in %s do not match any registered route:\n  %s\n".
        'Fix the path, or add it to PLANNED if its module is not built yet.',
        ROUTE_MAP,
        implode("\n  ", $missing),
    ));
});

test('planned urls are still unbuilt', function () {
    $registered = registeredPaths();

    $built = array_values(array_filter(
        PLANNED,
        fn (string $path) => in_array($path, $registered, true),
    ));

    expect($built)->toBe([], sprintf(
        "These urls now resolve and should be removed from PLANNED in %s's test:\n  %s",
        ROUTE_MAP,
        implode("\n  ", $built),
    ));
});

test('every planned url is actually declared in the route map', function () {
    $declared = declaredPaths();

    $stale = array_values(array_filter(
        PLANNED,
        fn (string $path) => ! in_array($path, $declared, true),
    ));

    expect($stale)->toBe([], sprintf(
        "PLANNED lists urls that no longer appear in %s:\n  %s",
        ROUTE_MAP,
        implode("\n  ", $stale),
    ));
});
