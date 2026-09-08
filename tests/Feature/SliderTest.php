<?php

use App\Enums\SliderTransition;
use App\Models\Slide;
use App\Models\Slider;
use App\Models\User;
use Inertia\Testing\AssertableInertia;

beforeEach(function () {
    $this->editor = User::factory()->create();
    $this->admin = User::factory()->admin()->create();
});

test('guests cannot reach the slider admin', function () {
    $this->get('/admin/sliders')->assertRedirect('/login');
});

test('index lists sliders with their slide counts, paginated', function () {
    $slider = Slider::factory()->homeHero()->create();
    Slide::factory()->count(3)->for($slider)->create();

    $this->actingAs($this->editor)
        ->get('/admin/sliders')
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('admin/sliders/index')
            ->has('sliders.data', 1)
            ->has('sliders.links')
            ->where('sliders.total', 1)
            ->where('sliders.data.0.key', 'home_hero')
            ->where('sliders.data.0.slides_count', 3)
            ->where('filters.sort', 'updated_at')
            ->where('filters.direction', 'desc')
        );
});

test('index paginates at the requested page size', function () {
    Slider::factory()->count(12)->create();

    $this->actingAs($this->editor)
        ->get('/admin/sliders?per_page=5')
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->has('sliders.data', 5)
            ->where('sliders.total', 12)
            ->where('sliders.last_page', 3)
        );
});

test('the default page size is one the rows-per-page dropdown offers', function () {
    Slider::factory()->create();

    $response = $this->actingAs($this->editor)->get('/admin/sliders');

    $default = $response->inertiaProps()['sliders']['per_page'];

    // Keep in step with pageSizeOptions in resources/js/components/admin/data-table.tsx.
    $offered = [10, 15, 25, 50, 100];

    expect($offered)->toContain($default);
});

test('index paginates one row per page so pagination is testable on a small set', function () {
    Slider::factory()->count(2)->create();

    $this->actingAs($this->editor)
        ->get('/admin/sliders?per_page=1')
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->has('sliders.data', 1)
            ->where('sliders.per_page', 1)
            ->where('sliders.total', 2)
            ->where('sliders.last_page', 2)
            ->where('sliders.current_page', 1)
        );

    $this->actingAs($this->editor)
        ->get('/admin/sliders?per_page=1&page=2')
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->has('sliders.data', 1)
            ->where('sliders.current_page', 2)
        );
});

test('the page size is bounded', function (int $perPage) {
    $this->actingAs($this->editor)
        ->get("/admin/sliders?per_page={$perPage}")
        ->assertSessionHasErrors('per_page');
})->with([
    'zero' => [0],
    'negative' => [-5],
    'over the cap' => [500],
]);

test('index searches on name and key', function (string $term) {
    Slider::factory()->create(['name' => 'Home Hero', 'key' => 'home_hero']);
    Slider::factory()->create(['name' => 'Footer Banner', 'key' => 'footer_banner']);

    $this->actingAs($this->editor)
        ->get('/admin/sliders?search='.urlencode($term))
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->has('sliders.data', 1)
            ->where('sliders.data.0.key', 'home_hero')
        );
})->with([
    'by name' => ['Hero'],
    'by key' => ['home_'],
]);

test('index sorts by an allowed column', function () {
    Slider::factory()->create(['name' => 'Zebra', 'key' => 'zebra']);
    Slider::factory()->create(['name' => 'Alpha', 'key' => 'alpha']);

    $this->actingAs($this->editor)
        ->get('/admin/sliders?sort=name&direction=asc')
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('sliders.data.0.name', 'Alpha')
            ->where('sliders.data.1.name', 'Zebra')
        );
});

test('index rejects sorting by an arbitrary column', function () {
    $this->actingAs($this->editor)
        ->get('/admin/sliders?sort=password')
        ->assertSessionHasErrors('sort');
});

test('a slider can be created', function () {
    $this->actingAs($this->editor)
        ->post('/admin/sliders', [
            'name' => 'Home Hero',
            'key' => 'home_hero',
            'is_active' => true,
            'autoplay' => true,
            'interval_ms' => 5000,
            'transition' => 'slide',
        ])
        ->assertRedirect()
        ->assertSessionHas('success');

    $slider = Slider::sole();
    expect($slider->key)->toBe('home_hero');
    expect($slider->transition)->toBe(SliderTransition::Slide);
});

test('the slider key is normalised to a lowercase underscored slug', function (string $input) {
    $this->actingAs($this->editor)->post('/admin/sliders', [
        'name' => 'Home Hero',
        'key' => $input,
        'interval_ms' => 5000,
        'transition' => 'slide',
    ]);

    expect(Slider::sole()->key)->toBe('home_hero');
})->with([
    'spaces' => ['Home Hero'],
    'mixed case' => ['Home_Hero'],
    'hyphens' => ['home-hero'],
]);

test('a differently cased key cannot duplicate an existing one', function () {
    Slider::factory()->homeHero()->create();

    $this->actingAs($this->editor)
        ->post('/admin/sliders', [
            'name' => 'Another',
            'key' => 'Home Hero',
            'interval_ms' => 5000,
            'transition' => 'slide',
        ])
        ->assertSessionHasErrors('key');

    expect(Slider::count())->toBe(1);
});

test('the interval and transition are validated', function (array $payload, string $field) {
    $this->actingAs($this->editor)
        ->post('/admin/sliders', [...[
            'name' => 'Home Hero',
            'key' => 'home_hero',
            'interval_ms' => 5000,
            'transition' => 'slide',
        ], ...$payload])
        ->assertSessionHasErrors($field);
})->with([
    'interval too small' => [['interval_ms' => 100], 'interval_ms'],
    'interval too large' => [['interval_ms' => 999999], 'interval_ms'],
    'unknown transition' => [['transition' => 'explode'], 'transition'],
]);

test('a slider can be updated', function () {
    $slider = Slider::factory()->homeHero()->create();

    $this->actingAs($this->editor)
        ->put("/admin/sliders/{$slider->id}", [
            'name' => 'Renamed',
            'key' => 'home_hero',
            'is_active' => false,
            'autoplay' => false,
            'interval_ms' => 8000,
            'transition' => 'fade',
        ])
        ->assertRedirect();

    $slider->refresh();
    expect($slider->name)->toBe('Renamed');
    expect($slider->is_active)->toBeFalse();
    expect($slider->transition)->toBe(SliderTransition::Fade);
});

test('a slider keeps its own key on update', function () {
    $slider = Slider::factory()->homeHero()->create();

    $this->actingAs($this->editor)
        ->put("/admin/sliders/{$slider->id}", [
            'name' => 'Home Hero',
            'key' => 'home_hero',
            'interval_ms' => 5000,
            'transition' => 'slide',
        ])
        ->assertSessionHasNoErrors();
});

test('only admins can delete a slider', function () {
    $slider = Slider::factory()->create();

    $this->actingAs($this->editor)
        ->delete("/admin/sliders/{$slider->id}")
        ->assertForbidden();

    expect(Slider::count())->toBe(1);

    $this->actingAs($this->admin)
        ->delete("/admin/sliders/{$slider->id}")
        ->assertRedirect('/admin/sliders');

    expect(Slider::count())->toBe(0);
});

test('deleting a slider cascades its slides', function () {
    $slider = Slider::factory()->create();
    Slide::factory()->count(3)->for($slider)->create();

    $this->actingAs($this->admin)->delete("/admin/sliders/{$slider->id}");

    expect(Slide::count())->toBe(0);
});

test('the preview page renders the slider through the public read path', function () {
    $slider = Slider::factory()->homeHero()->create();
    $live = Slide::factory()->for($slider)->create();
    Slide::factory()->for($slider)->inactive()->create();

    $this->actingAs($this->editor)
        ->get("/admin/sliders/{$slider->id}/preview")
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('admin/sliders/preview')
            ->where('slider.key', 'home_hero')
            // Live slides only, matching what the public site will get.
            ->has('hero.slides', 1)
            ->where('hero.slides.0.id', $live->id)
        );
});

test('an inactive slider can still be previewed', function () {
    $slider = Slider::factory()->homeHero()->inactive()->create();
    Slide::factory()->for($slider)->create();

    $this->actingAs($this->editor)
        ->get("/admin/sliders/{$slider->id}/preview")
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('slider.is_active', false)
            ->has('hero.slides', 1)
        );
});

test('guests cannot preview a slider', function () {
    $slider = Slider::factory()->create();

    $this->get("/admin/sliders/{$slider->id}/preview")->assertRedirect('/login');
});

test('the edit page exposes the slider, its ordered slides and the enum options', function () {
    $slider = Slider::factory()->homeHero()->create();
    Slide::factory()->for($slider)->create(['sort_order' => 2, 'title' => 'Second']);
    Slide::factory()->for($slider)->create(['sort_order' => 1, 'title' => 'First']);

    $this->actingAs($this->editor)
        ->get("/admin/sliders/{$slider->id}/edit")
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('admin/sliders/edit')
            ->where('slider.key', 'home_hero')
            ->has('slides', 2)
            ->where('slides.0.title', 'First')
            ->where('slides.1.title', 'Second')
            ->has('transitions', 2)
            ->has('textPositions', 3)
        );
});
