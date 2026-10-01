<?php

use App\Models\BlogPost;
use App\Models\BlogTag;
use App\Models\User;
use Inertia\Testing\AssertableInertia;

beforeEach(function () {
    $this->editor = User::factory()->create();
    $this->admin = User::factory()->admin()->create();
});

test('guests cannot reach the blog tags screen', function () {
    $this->get('/admin/blog/tags')->assertRedirect('/login');
});

test('the index lists tags alphabetically with their post counts', function () {
    BlogTag::factory()->create(['name' => 'Zonal']);
    $academy = BlogTag::factory()->create(['name' => 'Academy']);
    $academy->posts()->attach(BlogPost::factory()->create());

    $this->actingAs($this->editor)
        ->get('/admin/blog/tags')
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('admin/blog/tags')
            ->has('tags', 2)
            ->where('tags.0.name', 'Academy')
            ->where('tags.0.posts_count', 1)
        );
});

test('a tag can be created and its slug derived from the name', function () {
    $this->actingAs($this->editor)
        ->post('/admin/blog/tags', ['name' => 'Under 19s'])
        ->assertSessionHas('success');

    expect(BlogTag::sole()->slug)->toBe('under-19s');
});

test('a duplicate slug is rejected', function () {
    BlogTag::factory()->create(['slug' => 'academy']);

    $this->actingAs($this->editor)
        ->post('/admin/blog/tags', ['name' => 'Academy'])
        ->assertSessionHasErrors('slug');
});

test('a tag can be updated', function () {
    $tag = BlogTag::factory()->create();

    $this->actingAs($this->editor)
        ->put("/admin/blog/tags/{$tag->id}", ['name' => 'Renamed', 'slug' => 'renamed'])
        ->assertSessionHas('success');

    expect($tag->refresh()->name)->toBe('Renamed');
});

test('only an admin can delete a tag, and it is deleted outright', function () {
    $tag = BlogTag::factory()->create();

    $this->actingAs($this->editor)
        ->delete("/admin/blog/tags/{$tag->id}")
        ->assertForbidden();

    $this->actingAs($this->admin)
        ->delete("/admin/blog/tags/{$tag->id}")
        ->assertSessionHas('success');

    expect(BlogTag::count())->toBe(0);
});
