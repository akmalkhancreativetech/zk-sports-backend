<?php

use App\Models\Slide;
use App\Models\Slider;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    Storage::fake('public');

    $this->editor = User::factory()->create();
    $this->slider = Slider::factory()->homeHero()->create();
});

/** @return array<string, mixed> */
function slidePayload(array $overrides = []): array
{
    return [
        'image' => UploadedFile::fake()->image('hero.jpg', 1920, 900),
        'image_alt' => 'Cricket kit on a pitch',
        'text_position' => 'left',
        'overlay_opacity' => 40,
        'is_active' => true,
        ...$overrides,
    ];
}

test('a slide can be added with an image', function () {
    $this->actingAs($this->editor)
        ->post("/admin/sliders/{$this->slider->id}/slides", slidePayload([
            'title' => 'Season sale',
        ]))
        ->assertRedirect()
        ->assertSessionHas('success');

    $slide = Slide::sole();

    expect($slide->title)->toBe('Season sale');
    expect($slide->slider_id)->toBe($this->slider->id);
    expect($slide->image_path)->toEndWith('.webp');

    Storage::disk('public')->assertExists($slide->image_path);
});

test('the upload is converted to webp regardless of the source format', function (string $name) {
    $this->actingAs($this->editor)->post(
        "/admin/sliders/{$this->slider->id}/slides",
        slidePayload(['image' => UploadedFile::fake()->image($name, 1200, 600)]),
    );

    $path = Slide::sole()->image_path;
    $contents = Storage::disk('public')->get($path);

    expect($path)->toEndWith('.webp');
    // getimagesizefromstring reports the real encoded format, not the extension.
    expect(getimagesizefromstring($contents)[2])->toBe(IMAGETYPE_WEBP);
})->with([
    'jpeg source' => ['hero.jpg'],
    'png source' => ['hero.png'],
]);

test('an oversized image is capped at 2560px on its long edge', function () {
    $this->actingAs($this->editor)->post(
        "/admin/sliders/{$this->slider->id}/slides",
        slidePayload(['image' => UploadedFile::fake()->image('huge.jpg', 4000, 1000)]),
    );

    $contents = Storage::disk('public')->get(Slide::sole()->image_path);
    [$width, $height] = getimagesizefromstring($contents);

    expect($width)->toBe(2560);
    expect($height)->toBe(640); // aspect ratio preserved
});

test('an image already within the cap is not upscaled', function () {
    $this->actingAs($this->editor)->post(
        "/admin/sliders/{$this->slider->id}/slides",
        slidePayload(['image' => UploadedFile::fake()->image('small.jpg', 800, 400)]),
    );

    $contents = Storage::disk('public')->get(Slide::sole()->image_path);
    [$width] = getimagesizefromstring($contents);

    expect($width)->toBe(800);
});

test('alt text is required', function () {
    $this->actingAs($this->editor)
        ->post("/admin/sliders/{$this->slider->id}/slides", slidePayload(['image_alt' => '']))
        ->assertSessionHasErrors('image_alt');

    expect(Slide::count())->toBe(0);
});

test('a desktop image is required when creating', function () {
    $payload = slidePayload();
    unset($payload['image']);

    $this->actingAs($this->editor)
        ->post("/admin/sliders/{$this->slider->id}/slides", $payload)
        ->assertSessionHasErrors('image');
});

test('a non-image upload is rejected', function () {
    $this->actingAs($this->editor)
        ->post("/admin/sliders/{$this->slider->id}/slides", slidePayload([
            'image' => UploadedFile::fake()->create('payload.pdf', 100, 'application/pdf'),
        ]))
        ->assertSessionHasErrors('image');

    expect(Slide::count())->toBe(0);
});

test('a cta label and url require each other', function (array $overrides, string $field) {
    $this->actingAs($this->editor)
        ->post("/admin/sliders/{$this->slider->id}/slides", slidePayload($overrides))
        ->assertSessionHasErrors($field);
})->with([
    'label without url' => [['cta_label' => 'Shop now'], 'cta_url'],
    'url without label' => [['cta_url' => '/services'], 'cta_label'],
]);

test('the end date must fall after the start date', function () {
    $this->actingAs($this->editor)
        ->post("/admin/sliders/{$this->slider->id}/slides", slidePayload([
            'starts_at' => now()->addWeek()->toDateTimeString(),
            'ends_at' => now()->toDateTimeString(),
        ]))
        ->assertSessionHasErrors('ends_at');
});

test('new slides are appended to the end of the order', function () {
    Slide::factory()->for($this->slider)->create(['sort_order' => 0]);
    Slide::factory()->for($this->slider)->create(['sort_order' => 1]);

    $this->actingAs($this->editor)
        ->post("/admin/sliders/{$this->slider->id}/slides", slidePayload());

    expect(Slide::latest('id')->first()->sort_order)->toBe(2);
});

test('replacing a slide image deletes the previous file', function () {
    $this->actingAs($this->editor)
        ->post("/admin/sliders/{$this->slider->id}/slides", slidePayload());

    $slide = Slide::sole();
    $original = $slide->image_path;

    $this->actingAs($this->editor)->put(
        "/admin/sliders/{$this->slider->id}/slides/{$slide->id}",
        slidePayload(['image' => UploadedFile::fake()->image('new.jpg', 1000, 500)]),
    );

    $slide->refresh();

    expect($slide->image_path)->not->toBe($original);
    Storage::disk('public')->assertMissing($original);
    Storage::disk('public')->assertExists($slide->image_path);
});

test('a slide can be updated without re-uploading its image', function () {
    $this->actingAs($this->editor)
        ->post("/admin/sliders/{$this->slider->id}/slides", slidePayload());

    $slide = Slide::sole();
    $original = $slide->image_path;

    $payload = slidePayload(['title' => 'Renamed']);
    unset($payload['image']);

    $this->actingAs($this->editor)
        ->put("/admin/sliders/{$this->slider->id}/slides/{$slide->id}", $payload)
        ->assertSessionHasNoErrors();

    $slide->refresh();
    expect($slide->title)->toBe('Renamed');
    expect($slide->image_path)->toBe($original);
    Storage::disk('public')->assertExists($original);
});

test('deleting a slide removes its image files', function () {
    $this->actingAs($this->editor)->post(
        "/admin/sliders/{$this->slider->id}/slides",
        slidePayload(['mobile_image' => UploadedFile::fake()->image('m.jpg', 768, 1000)]),
    );

    $slide = Slide::sole();
    $desktop = $slide->image_path;
    $mobile = $slide->mobile_image_path;

    expect($mobile)->not->toBeNull();

    $this->actingAs($this->editor)
        ->delete("/admin/sliders/{$this->slider->id}/slides/{$slide->id}");

    Storage::disk('public')->assertMissing($desktop);
    Storage::disk('public')->assertMissing($mobile);
    expect(Slide::count())->toBe(0);
});

test('a slide belonging to another slider is not reachable', function () {
    $other = Slider::factory()->create();
    $slide = Slide::factory()->for($other)->create();

    $this->actingAs($this->editor)
        ->delete("/admin/sliders/{$this->slider->id}/slides/{$slide->id}")
        ->assertNotFound();

    expect(Slide::count())->toBe(1);
});

test('reorder persists the whole set in one request', function () {
    $first = Slide::factory()->for($this->slider)->create(['sort_order' => 0]);
    $second = Slide::factory()->for($this->slider)->create(['sort_order' => 1]);
    $third = Slide::factory()->for($this->slider)->create(['sort_order' => 2]);

    $this->actingAs($this->editor)
        ->post("/admin/sliders/{$this->slider->id}/slides/reorder", [
            'slides' => [
                ['id' => $third->id, 'sort_order' => 0],
                ['id' => $first->id, 'sort_order' => 1],
                ['id' => $second->id, 'sort_order' => 2],
            ],
        ])
        ->assertRedirect()
        ->assertSessionHas('success');

    expect($this->slider->slides()->ordered()->pluck('id')->all())
        ->toBe([$third->id, $first->id, $second->id]);
});

test('reorder rejects a slide id from another slider', function () {
    $mine = Slide::factory()->for($this->slider)->create(['sort_order' => 0]);
    $theirs = Slide::factory()->for(Slider::factory())->create(['sort_order' => 0]);

    $this->actingAs($this->editor)
        ->post("/admin/sliders/{$this->slider->id}/slides/reorder", [
            'slides' => [
                ['id' => $mine->id, 'sort_order' => 1],
                ['id' => $theirs->id, 'sort_order' => 0],
            ],
        ])
        ->assertSessionHasErrors('slides.1.id');

    expect($theirs->refresh()->sort_order)->toBe(0);
});

test('the live scope excludes hidden, unstarted and expired slides', function () {
    $visible = Slide::factory()->for($this->slider)->create();
    Slide::factory()->for($this->slider)->inactive()->create();
    Slide::factory()->for($this->slider)->scheduled()->create();
    Slide::factory()->for($this->slider)->expired()->create();

    expect($this->slider->slides()->live()->pluck('id')->all())->toBe([$visible->id]);
});

test('the ordered scope sorts by sort_order then id', function () {
    $b = Slide::factory()->for($this->slider)->create(['sort_order' => 1]);
    $a = Slide::factory()->for($this->slider)->create(['sort_order' => 0]);
    $c = Slide::factory()->for($this->slider)->create(['sort_order' => 1]);

    expect($this->slider->slides()->ordered()->pluck('id')->all())
        ->toBe([$a->id, $b->id, $c->id]);
});
