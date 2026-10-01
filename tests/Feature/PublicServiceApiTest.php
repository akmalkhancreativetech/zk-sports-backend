<?php

use App\Models\Service;
use App\Models\ServiceCategory;

/*
 * The HTTP surface the Next.js site reads (docs/frontend-plan.md §4).
 *
 * The assertions that matter most here are the negative ones. An admin screen
 * showing a deactivated service is fine; this endpoint leaking one is a public
 * disclosure, and so is any internal column riding along in the payload.
 */

test('the index lists active services', function () {
    $category = ServiceCategory::factory()->create(['name' => 'Team Kits']);
    Service::factory()->for($category, 'category')->create(['title' => 'Custom Jersey']);

    $this->getJson('/api/v1/services')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.title', 'Custom Jersey')
        ->assertJsonPath('data.0.category.name', 'Team Kits')
        // Laravel's pagination envelope — the frontend's `paginated()` schema
        // is written against these keys.
        ->assertJsonStructure(['data', 'links', 'meta']);
});

test('the index hides inactive and deleted services', function () {
    Service::factory()->create(['title' => 'Visible']);
    Service::factory()->inactive()->create(['title' => 'Deactivated']);
    Service::factory()->create(['title' => 'Removed'])->delete();

    $response = $this->getJson('/api/v1/services')->assertOk();

    expect($response->json('data.*.title'))->toBe(['Visible']);
});

test('the index omits the long description', function () {
    // `excerpt` is what a card renders; shipping full HTML per row would dwarf
    // the rest of the payload.
    Service::factory()->create(['description' => '<p>Long form copy</p>']);

    $this->getJson('/api/v1/services')
        ->assertOk()
        ->assertJsonMissingPath('data.0.description');
});

test('the index filters by category slug', function () {
    $kits = ServiceCategory::factory()->create(['name' => 'Kits']);
    $balls = ServiceCategory::factory()->create(['name' => 'Balls']);
    Service::factory()->for($kits, 'category')->create(['title' => 'Jersey']);
    Service::factory()->for($balls, 'category')->create(['title' => 'Match Ball']);

    $response = $this->getJson('/api/v1/services?category='.$kits->slug)->assertOk();

    expect($response->json('data.*.title'))->toBe(['Jersey']);
});

test('the index filters by search term', function () {
    Service::factory()->create(['title' => 'Custom Jersey', 'excerpt' => 'Sublimated']);
    Service::factory()->create(['title' => 'Match Ball', 'excerpt' => 'Hand stitched']);

    $response = $this->getJson('/api/v1/services?search=jersey')->assertOk();

    expect($response->json('data.*.title'))->toBe(['Custom Jersey']);
});

test('the index filters to featured services', function () {
    Service::factory()->featured()->create(['title' => 'Custom Jersey']);
    Service::factory()->create(['title' => 'Match Ball']);

    $response = $this->getJson('/api/v1/services?featured=1')->assertOk();

    expect($response->json('data.*.title'))->toBe(['Custom Jersey']);
});

test('the index ignores an absent featured flag rather than filtering on it', function () {
    // `boolean()` makes `?featured=0` and a missing param behave alike, so the
    // catalogue listing is never accidentally narrowed to featured only.
    Service::factory()->featured()->create();
    Service::factory()->create();

    $this->getJson('/api/v1/services')->assertOk()->assertJsonCount(2, 'data');
    $this->getJson('/api/v1/services?featured=0')->assertOk()->assertJsonCount(2, 'data');
});

test('a service is shown by slug with its full detail', function () {
    $service = Service::factory()->priced()->create([
        'title' => 'Custom Jersey',
        'description' => '<p>Long form copy</p>',
    ]);
    $service->images()->create(['path' => 'services/jersey.jpg', 'alt' => 'Front', 'sort_order' => 0]);
    $service->priceTiers()->create(['min_qty' => 10, 'max_qty' => null, 'unit_price' => 2200]);
    $option = $service->options()->create([
        'name' => 'Size',
        'type' => 'select',
        'is_required' => true,
        'sort_order' => 0,
    ]);
    $option->values()->create(['label' => 'XL', 'price_delta' => 150, 'sort_order' => 0]);

    $this->getJson("/api/v1/services/{$service->slug}")
        ->assertOk()
        ->assertJsonPath('data.description', '<p>Long form copy</p>')
        ->assertJsonPath('data.images.0.alt', 'Front')
        ->assertJsonPath('data.price_tiers.0.range_label', '10+')
        ->assertJsonPath('data.options.0.values.0.label', 'XL');
});

test('an inactive service is a 404, not a rejected record', function () {
    $service = Service::factory()->inactive()->create();

    $this->getJson("/api/v1/services/{$service->slug}")->assertNotFound();
});

test('a missing service slug is a 404', function () {
    $this->getJson('/api/v1/services/no-such-service')->assertNotFound();
});

test('the category list counts only active services', function () {
    $category = ServiceCategory::factory()->create(['name' => 'Kits']);
    Service::factory()->for($category, 'category')->create();
    Service::factory()->for($category, 'category')->inactive()->create();

    $this->getJson('/api/v1/service-categories')
        ->assertOk()
        ->assertJsonPath('data.0.name', 'Kits')
        ->assertJsonPath('data.0.services_count', 1);
});

test('the category list hides inactive categories', function () {
    ServiceCategory::factory()->create(['name' => 'Kits']);
    ServiceCategory::factory()->inactive()->create(['name' => 'Retired']);

    $response = $this->getJson('/api/v1/service-categories')->assertOk();

    expect($response->json('data.*.name'))->toBe(['Kits']);
});
