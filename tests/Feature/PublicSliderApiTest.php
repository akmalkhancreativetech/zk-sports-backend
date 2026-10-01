<?php

use App\Models\Slide;
use App\Models\Slider;

/*
 * The HTTP layer over App\Services\PublicSliders.
 *
 * PublicSliderTest already covers the shaping, ordering, live-window and
 * caching rules against the service directly. This file deliberately does not
 * repeat them — it asserts only what the endpoint adds: the status codes, and
 * that the response is the service's payload unwrapped.
 */

test('an active slider is served by key', function () {
    $slider = Slider::factory()->homeHero()->create(['interval_ms' => 7000]);
    Slide::factory()->for($slider)->create(['title' => 'First', 'sort_order' => 0]);

    $this->getJson('/api/v1/sliders/home_hero')
        ->assertOk()
        // No `data` envelope: this endpoint returns the service payload as-is
        // rather than re-wrapping it in a Resource.
        ->assertJsonPath('key', 'home_hero')
        ->assertJsonPath('interval_ms', 7000)
        ->assertJsonPath('slides.0.title', 'First');
});

test('an unknown key is a 404', function () {
    $this->getJson('/api/v1/sliders/no_such_slider')->assertNotFound();
});

test('an inactive slider is a 404', function () {
    $slider = Slider::factory()->homeHero()->inactive()->create();
    Slide::factory()->for($slider)->create();

    $this->getJson('/api/v1/sliders/home_hero')->assertNotFound();
});
