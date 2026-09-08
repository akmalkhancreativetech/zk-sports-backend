<?php

use App\Models\Slide;
use App\Models\Slider;
use App\Models\User;
use App\Services\PublicSliders;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia;

beforeEach(function () {
    Storage::fake('public');

    $this->editor = User::factory()->create();
    $this->admin = User::factory()->admin()->create();
});

test('guests cannot run bulk actions', function () {
    $this->post('/admin/sliders/bulk', ['action' => 'activate', 'ids' => [1]])
        ->assertRedirect('/login');
});

test('bulk activate and deactivate flip the selected sliders only', function (string $action, bool $expected) {
    $targets = Slider::factory()->count(2)->create(['is_active' => ! $expected]);
    $untouched = Slider::factory()->create(['is_active' => ! $expected]);

    $this->actingAs($this->editor)
        ->post('/admin/sliders/bulk', [
            'action' => $action,
            'ids' => $targets->pluck('id')->all(),
        ])
        ->assertRedirect()
        ->assertSessionHas('success');

    foreach ($targets as $slider) {
        expect($slider->refresh()->is_active)->toBe($expected);
    }

    expect($untouched->refresh()->is_active)->toBe(! $expected);
})->with([
    'activate' => ['activate', true],
    'deactivate' => ['deactivate', false],
]);

test('bulk delete is admin only', function () {
    $sliders = Slider::factory()->count(2)->create();

    $this->actingAs($this->editor)
        ->post('/admin/sliders/bulk', [
            'action' => 'delete',
            'ids' => $sliders->pluck('id')->all(),
        ])
        ->assertForbidden();

    expect(Slider::count())->toBe(2);

    $this->actingAs($this->admin)
        ->post('/admin/sliders/bulk', [
            'action' => 'delete',
            'ids' => $sliders->pluck('id')->all(),
        ])
        ->assertRedirect();

    expect(Slider::count())->toBe(0);
});

test('a bulk delete an editor cannot finish changes nothing at all', function () {
    // Authorisation runs over every row before any write, so a partial
    // application is impossible.
    $sliders = Slider::factory()->count(3)->create(['is_active' => true]);

    $this->actingAs($this->editor)
        ->post('/admin/sliders/bulk', [
            'action' => 'delete',
            'ids' => $sliders->pluck('id')->all(),
        ])
        ->assertForbidden();

    expect(Slider::count())->toBe(3);
});

test('bulk delete removes slides and their image files', function () {
    $slider = Slider::factory()->create();
    $slide = Slide::factory()->for($slider)->create(['image_path' => 'sliders/bulk.webp']);
    Storage::disk('public')->put($slide->image_path, 'x');

    $this->actingAs($this->admin)
        ->post('/admin/sliders/bulk', ['action' => 'delete', 'ids' => [$slider->id]]);

    expect(Slide::count())->toBe(0);
    Storage::disk('public')->assertMissing('sliders/bulk.webp');
});

test('bulk actions flush the public cache', function () {
    $slider = Slider::factory()->homeHero()->create(['is_active' => true]);
    Slide::factory()->for($slider)->create();

    app(PublicSliders::class)->forKey('home_hero');
    expect(Cache::has(PublicSliders::cacheKey('home_hero')))->toBeTrue();

    $this->actingAs($this->editor)
        ->post('/admin/sliders/bulk', ['action' => 'deactivate', 'ids' => [$slider->id]]);

    expect(Cache::has(PublicSliders::cacheKey('home_hero')))->toBeFalse();
});

test('bulk validates its input', function (array $payload, string $field) {
    $this->actingAs($this->admin)
        ->post('/admin/sliders/bulk', $payload)
        ->assertSessionHasErrors($field);
})->with([
    'unknown action' => [['action' => 'destroy_everything', 'ids' => [1]], 'action'],
    'missing ids' => [['action' => 'activate'], 'ids'],
    'empty ids' => [['action' => 'activate', 'ids' => []], 'ids'],
    'nonexistent id' => [['action' => 'activate', 'ids' => [99999]], 'ids.0'],
]);

test('the status filter narrows the list', function (string $status, bool $expected) {
    Slider::factory()->create(['name' => 'Live one', 'is_active' => true]);
    Slider::factory()->create(['name' => 'Hidden one', 'is_active' => false]);

    $this->actingAs($this->editor)
        ->get("/admin/sliders?status={$status}")
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->has('sliders.data', 1)
            ->where('sliders.data.0.is_active', $expected)
            ->where('filters.status', $status)
        );
})->with([
    'active' => ['active', true],
    'inactive' => ['inactive', false],
]);

test('an unknown status is rejected', function () {
    $this->actingAs($this->editor)
        ->get('/admin/sliders?status=maybe')
        ->assertSessionHasErrors('status');
});

test('search and status filters combine', function () {
    Slider::factory()->create(['name' => 'Home Hero', 'key' => 'home_hero', 'is_active' => true]);
    Slider::factory()->create(['name' => 'Home Footer', 'key' => 'home_footer', 'is_active' => false]);

    $this->actingAs($this->editor)
        ->get('/admin/sliders?search=Home&status=active')
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->has('sliders.data', 1)
            ->where('sliders.data.0.key', 'home_hero')
        );
});
