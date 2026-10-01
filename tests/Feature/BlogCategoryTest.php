<?php

use App\Models\BlogCategory;
use App\Models\BlogPost;
use App\Models\User;
use Inertia\Testing\AssertableInertia;

beforeEach(function () {
    $this->editor = User::factory()->create();
    $this->admin = User::factory()->admin()->create();
});

test('guests cannot reach the blog categories screen', function () {
    $this->get('/admin/blog/categories')->assertRedirect('/login');
});

test('the index lists live categories and trashed ones separately', function () {
    $live = BlogCategory::factory()->create(['name' => 'News']);
    BlogPost::factory()->for($live, 'category')->create();
    BlogCategory::factory()->create(['name' => 'Gone'])->delete();

    $this->actingAs($this->editor)
        ->get('/admin/blog/categories')
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('admin/blog/categories')
            ->has('categories', 1)
            ->where('categories.0.name', 'News')
            ->where('categories.0.posts_count', 1)
            ->has('trashed', 1)
            ->where('trashed.0.name', 'Gone')
        );
});

test('a category can be created and its slug derived from the name', function () {
    $this->actingAs($this->editor)
        ->post('/admin/blog/categories', ['name' => 'Match Reports', 'is_active' => true])
        ->assertSessionHas('success');

    expect(BlogCategory::sole()->slug)->toBe('match-reports');
});

test('a duplicate slug is rejected', function () {
    BlogCategory::factory()->create(['slug' => 'news']);

    $this->actingAs($this->editor)
        ->post('/admin/blog/categories', ['name' => 'News', 'slug' => 'news'])
        ->assertSessionHasErrors('slug');
});

test('new categories are appended to the end of the order', function () {
    BlogCategory::factory()->create(['sort_order' => 4]);

    $this->actingAs($this->editor)
        ->post('/admin/blog/categories', ['name' => 'Next']);

    expect(BlogCategory::latest('id')->first()->sort_order)->toBe(5);
});

test('a category can be updated', function () {
    $category = BlogCategory::factory()->create();

    $this->actingAs($this->editor)
        ->put("/admin/blog/categories/{$category->id}", [
            'name' => 'Renamed',
            'slug' => 'renamed',
            'description' => 'Club news.',
            'is_active' => false,
        ])
        ->assertSessionHas('success');

    $category->refresh();

    expect($category->name)->toBe('Renamed')
        ->and($category->description)->toBe('Club news.')
        ->and($category->is_active)->toBeFalse();
});

test('deleting a category only soft deletes it', function () {
    $category = BlogCategory::factory()->create();

    $this->actingAs($this->editor)
        ->delete("/admin/blog/categories/{$category->id}")
        ->assertForbidden();

    $this->actingAs($this->admin)
        ->delete("/admin/blog/categories/{$category->id}")
        ->assertSessionHas('success');

    expect(BlogCategory::count())->toBe(0)
        ->and(BlogCategory::withTrashed()->count())->toBe(1);
});

test('an admin can restore a trashed category', function () {
    $category = BlogCategory::factory()->create();
    $category->delete();

    $this->actingAs($this->editor)
        ->put("/admin/blog/categories/{$category->id}/restore")
        ->assertForbidden();

    $this->actingAs($this->admin)
        ->put("/admin/blog/categories/{$category->id}/restore")
        ->assertSessionHas('success');

    expect(BlogCategory::count())->toBe(1);
});

test('a trashed category still holds its slug until it is purged', function () {
    $category = BlogCategory::factory()->create(['slug' => 'news']);
    $category->delete();

    $this->actingAs($this->editor)
        ->post('/admin/blog/categories', ['name' => 'News', 'slug' => 'news'])
        ->assertSessionHasErrors('slug');

    $this->actingAs($this->admin)
        ->delete("/admin/blog/categories/{$category->id}/force")
        ->assertSessionHas('success');

    $this->actingAs($this->editor)
        ->post('/admin/blog/categories', ['name' => 'News', 'slug' => 'news'])
        ->assertSessionHasNoErrors();

    expect(BlogCategory::withTrashed()->count())->toBe(1);
});

test('reorder persists the whole set in one request', function () {
    $first = BlogCategory::factory()->create(['sort_order' => 0]);
    $second = BlogCategory::factory()->create(['sort_order' => 1]);

    $this->actingAs($this->editor)
        ->post('/admin/blog/categories/reorder', [
            'categories' => [
                ['id' => $second->id, 'sort_order' => 0],
                ['id' => $first->id, 'sort_order' => 1],
            ],
        ])
        ->assertSessionHas('success');

    expect($first->refresh()->sort_order)->toBe(1)
        ->and($second->refresh()->sort_order)->toBe(0);
});
