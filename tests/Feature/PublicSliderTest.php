<?php

use App\Models\Slide;
use App\Models\Slider;
use App\Models\User;
use App\Services\PublicSliders;
use Illuminate\Support\Facades\Cache;

test('an unknown key returns null', function () {
    expect(app(PublicSliders::class)->forKey('home_hero'))->toBeNull();
});

test('the read path returns the active home_hero in order', function () {
    $slider = Slider::factory()->homeHero()->create(['interval_ms' => 7000]);
    Slide::factory()->for($slider)->create(['title' => 'Second', 'sort_order' => 1]);
    Slide::factory()->for($slider)->create(['title' => 'First', 'sort_order' => 0]);

    $hero = app(PublicSliders::class)->forKey('home_hero');

    expect($hero['key'])->toBe('home_hero');
    expect($hero['interval_ms'])->toBe(7000);
    expect(array_column($hero['slides'], 'title'))->toBe(['First', 'Second']);
});

test('the read path omits admin-only fields', function () {
    $slider = Slider::factory()->homeHero()->create();
    Slide::factory()->for($slider)->create();

    $slide = app(PublicSliders::class)->forKey('home_hero')['slides'][0];

    expect($slide)->not->toHaveKeys(['sort_order', 'is_active', 'starts_at', 'ends_at']);
    expect($slide)->toHaveKeys(['image_url', 'image_alt', 'overlay_opacity']);
});

test('an inactive slider is not exposed by the cached read path', function () {
    $slider = Slider::factory()->homeHero()->inactive()->create();
    Slide::factory()->for($slider)->create();

    expect(app(PublicSliders::class)->forKey('home_hero'))->toBeNull();
});

test('only live slides reach the read path', function () {
    $slider = Slider::factory()->homeHero()->create();
    $live = Slide::factory()->for($slider)->create();
    Slide::factory()->for($slider)->inactive()->create();
    Slide::factory()->for($slider)->scheduled()->create();
    Slide::factory()->for($slider)->expired()->create();

    $hero = app(PublicSliders::class)->forKey('home_hero');

    expect($hero['slides'])->toHaveCount(1);
    expect($hero['slides'][0]['id'])->toBe($live->id);
});

test('the public payload is cached', function () {
    $slider = Slider::factory()->homeHero()->create();
    Slide::factory()->for($slider)->create();

    app(PublicSliders::class)->forKey('home_hero');

    expect(Cache::has(PublicSliders::cacheKey('home_hero')))->toBeTrue();
});

test('saving a slider flushes its cached payload', function () {
    $slider = Slider::factory()->homeHero()->create();
    app(PublicSliders::class)->forKey('home_hero');

    $slider->update(['name' => 'Renamed']);

    expect(Cache::has(PublicSliders::cacheKey('home_hero')))->toBeFalse();
});

test('renaming the key flushes the old cache entry too', function () {
    $slider = Slider::factory()->homeHero()->create();
    app(PublicSliders::class)->forKey('home_hero');

    $slider->update(['key' => 'retired_hero']);

    expect(Cache::has(PublicSliders::cacheKey('home_hero')))->toBeFalse();
});

test('saving a slide flushes its parent slider cache', function () {
    $slider = Slider::factory()->homeHero()->create();
    $slide = Slide::factory()->for($slider)->create();

    app(PublicSliders::class)->forKey('home_hero');

    $slide->update(['title' => 'Changed']);

    expect(Cache::has(PublicSliders::cacheKey('home_hero')))->toBeFalse();
});

test('reordering slides flushes the cache even though it bypasses model events', function () {
    $slider = Slider::factory()->homeHero()->create();
    $first = Slide::factory()->for($slider)->create(['sort_order' => 0]);
    $second = Slide::factory()->for($slider)->create(['sort_order' => 1]);

    $this->actingAs(User::factory()->create());

    app(PublicSliders::class)->forKey('home_hero');
    expect(Cache::has(PublicSliders::cacheKey('home_hero')))->toBeTrue();

    $this->post("/admin/sliders/{$slider->id}/slides/reorder", [
        'slides' => [
            ['id' => $second->id, 'sort_order' => 0],
            ['id' => $first->id, 'sort_order' => 1],
        ],
    ]);

    expect(Cache::has(PublicSliders::cacheKey('home_hero')))->toBeFalse();
});
