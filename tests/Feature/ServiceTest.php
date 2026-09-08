<?php

use App\Models\Service;
use App\Models\ServiceCategory;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia;

beforeEach(function () {
    Storage::fake('public');

    $this->editor = User::factory()->create();
    $this->admin = User::factory()->admin()->create();
});

/** @return array<string, mixed> */
function servicePayload(array $overrides = []): array
{
    return [
        'title' => 'Cricket Kits',
        'slug' => 'cricket-kits',
        'is_active' => true,
        'is_featured' => false,
        ...$overrides,
    ];
}

test('guests cannot reach the services admin', function () {
    $this->get('/admin/services')->assertRedirect('/login');
});

test('index lists services with category and gallery counts', function () {
    $category = ServiceCategory::factory()->create(['name' => 'Apparel']);
    $service = Service::factory()->for($category, 'category')->create(['title' => 'Cricket Kits']);
    $service->images()->create(['path' => 'services/gallery/a.webp', 'sort_order' => 0]);

    $this->actingAs($this->editor)
        ->get('/admin/services')
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('admin/services/index')
            ->has('services.data', 1)
            ->where('services.data.0.title', 'Cricket Kits')
            ->where('services.data.0.category', 'Apparel')
            ->where('services.data.0.images_count', 1)
            ->has('categories', 1)
        );
});

test('a service can be created', function () {
    $this->actingAs($this->editor)
        ->post('/admin/services', servicePayload())
        ->assertRedirect()
        ->assertSessionHas('success');

    expect(Service::sole()->slug)->toBe('cricket-kits');
});

test('the slug is derived from the title when omitted', function () {
    $payload = servicePayload();
    unset($payload['slug']);

    $this->actingAs($this->editor)->post('/admin/services', $payload);

    expect(Service::sole()->slug)->toBe('cricket-kits');
});

test('the slug is normalised so differing case cannot duplicate', function () {
    Service::factory()->create(['slug' => 'cricket-kits']);

    $this->actingAs($this->editor)
        ->post('/admin/services', servicePayload(['slug' => 'Cricket Kits']))
        ->assertSessionHasErrors('slug');

    expect(Service::count())->toBe(1);
});

test('a soft-deleted service still holds its slug', function () {
    $service = Service::factory()->create(['slug' => 'cricket-kits']);
    $service->delete();

    // The unique index covers trashed rows, so reuse is refused rather than
    // failing at the database.
    $this->actingAs($this->editor)
        ->post('/admin/services', servicePayload(['slug' => 'cricket-kits']))
        ->assertSessionHasErrors('slug');
});

test('validation rejects bad input', function (array $overrides, string $field) {
    $this->actingAs($this->editor)
        ->post('/admin/services', servicePayload($overrides))
        ->assertSessionHasErrors($field);
})->with([
    'missing title' => [['title' => ''], 'title'],
    'excerpt too long' => [['excerpt' => str_repeat('a', 301)], 'excerpt'],
    'meta description too long' => [['meta_description' => str_repeat('a', 321)], 'meta_description'],
    'negative price' => [['price_from' => -1, 'price_unit' => 'per kit'], 'price_from'],
    'price without a unit' => [['price_from' => 100], 'price_unit'],
    'unknown category' => [['category_id' => 9999], 'category_id'],
]);

test('money is stored as a decimal, not a float', function () {
    $this->actingAs($this->editor)->post('/admin/services', servicePayload([
        'price_from' => '2500.50',
        'price_unit' => 'per kit',
    ]));

    // decimal:2 cast keeps it a string, so no float rounding creeps in.
    expect(Service::sole()->price_from)->toBe('2500.50');
});

test('a service can be updated', function () {
    $service = Service::factory()->create();

    $this->actingAs($this->editor)
        ->put("/admin/services/{$service->id}", servicePayload([
            'title' => 'Renamed',
            'slug' => 'renamed',
            'is_active' => false,
        ]))
        ->assertRedirect();

    $service->refresh();
    expect($service->title)->toBe('Renamed');
    expect($service->is_active)->toBeFalse();
});

test('deleting a service only soft deletes it', function () {
    $service = Service::factory()->create();

    $this->actingAs($this->editor)
        ->delete("/admin/services/{$service->id}")
        ->assertForbidden();

    $this->actingAs($this->admin)
        ->delete("/admin/services/{$service->id}")
        ->assertRedirect('/admin/services');

    expect(Service::count())->toBe(0);
    expect(Service::withTrashed()->count())->toBe(1);
});

test('a featured image is converted to webp', function () {
    $this->actingAs($this->editor)->post('/admin/services', servicePayload([
        'featured_image' => UploadedFile::fake()->image('kit.jpg', 1200, 800),
    ]));

    $path = Service::sole()->featured_image;

    expect($path)->toEndWith('.webp');
    Storage::disk('public')->assertExists($path);
});

test('replacing the featured image deletes the old file', function () {
    $this->actingAs($this->editor)->post('/admin/services', servicePayload([
        'featured_image' => UploadedFile::fake()->image('kit.jpg', 800, 600),
    ]));

    $service = Service::sole();
    $original = $service->featured_image;

    $this->actingAs($this->editor)->put("/admin/services/{$service->id}", servicePayload([
        'featured_image' => UploadedFile::fake()->image('new.jpg', 800, 600),
    ]));

    expect($service->refresh()->featured_image)->not->toBe($original);
    Storage::disk('public')->assertMissing($original);
});

test('new services are appended to the end of the order', function () {
    Service::factory()->create(['sort_order' => 4]);

    $this->actingAs($this->editor)->post('/admin/services', servicePayload());

    expect(Service::latest('id')->first()->sort_order)->toBe(5);
});

test('reorder persists the whole set in one request', function () {
    $first = Service::factory()->create(['sort_order' => 0]);
    $second = Service::factory()->create(['sort_order' => 1]);

    $this->actingAs($this->editor)
        ->post('/admin/services/reorder', [
            'services' => [
                ['id' => $second->id, 'sort_order' => 0],
                ['id' => $first->id, 'sort_order' => 1],
            ],
        ])
        ->assertRedirect();

    expect(Service::ordered()->pluck('id')->all())->toBe([$second->id, $first->id]);
});
