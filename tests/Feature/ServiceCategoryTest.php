<?php

use App\Models\Service;
use App\Models\ServiceCategory;
use App\Models\User;
use Inertia\Testing\AssertableInertia;

beforeEach(function () {
    $this->editor = User::factory()->create();
    $this->admin = User::factory()->admin()->create();
});

test('guests cannot reach the categories screen', function () {
    $this->get('/admin/service-categories')->assertRedirect('/login');
});

test('the index lists live categories and trashed ones separately', function () {
    $live = ServiceCategory::factory()->create(['name' => 'Apparel']);
    Service::factory()->for($live, 'category')->create();
    ServiceCategory::factory()->create(['name' => 'Gone'])->delete();

    $this->actingAs($this->editor)
        ->get('/admin/service-categories')
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('admin/services/categories')
            ->has('categories', 1)
            ->where('categories.0.name', 'Apparel')
            ->where('categories.0.services_count', 1)
            ->has('trashed', 1)
            ->where('trashed.0.name', 'Gone')
        );
});

test('a category can be created and its slug derived from the name', function () {
    $this->actingAs($this->editor)
        ->post('/admin/service-categories', ['name' => 'Team Apparel', 'is_active' => true])
        ->assertSessionHas('success');

    expect(ServiceCategory::sole()->slug)->toBe('team-apparel');
});

test('a duplicate slug is rejected', function () {
    ServiceCategory::factory()->create(['slug' => 'apparel']);

    $this->actingAs($this->editor)
        ->post('/admin/service-categories', ['name' => 'Apparel', 'slug' => 'apparel'])
        ->assertSessionHasErrors('slug');
});

test('a category can be updated', function () {
    $category = ServiceCategory::factory()->create();

    $this->actingAs($this->editor)
        ->put("/admin/service-categories/{$category->id}", [
            'name' => 'Renamed',
            'slug' => 'renamed',
            'description' => 'Kit and clothing.',
            'is_active' => false,
        ])
        ->assertSessionHas('success');

    $category->refresh();

    expect($category->name)->toBe('Renamed')
        ->and($category->description)->toBe('Kit and clothing.')
        ->and($category->is_active)->toBeFalse();
});

test('deleting a category only soft deletes it and keeps its services attached', function () {
    $category = ServiceCategory::factory()->create();
    $service = Service::factory()->for($category, 'category')->create();

    $this->actingAs($this->editor)
        ->delete("/admin/service-categories/{$category->id}")
        ->assertForbidden();

    $this->actingAs($this->admin)
        ->delete("/admin/service-categories/{$category->id}")
        ->assertSessionHas('success');

    expect(ServiceCategory::count())->toBe(0)
        ->and(ServiceCategory::withTrashed()->count())->toBe(1)
        ->and($service->refresh()->category_id)->toBe($category->id);
});

test('an admin can restore a trashed category', function () {
    $category = ServiceCategory::factory()->create();
    $category->delete();

    $this->actingAs($this->editor)
        ->put("/admin/service-categories/{$category->id}/restore")
        ->assertForbidden();

    $this->actingAs($this->admin)
        ->put("/admin/service-categories/{$category->id}/restore")
        ->assertSessionHas('success');

    expect(ServiceCategory::count())->toBe(1);
});

test('force deleting a category leaves its services uncategorised', function () {
    $category = ServiceCategory::factory()->create();
    $service = Service::factory()->for($category, 'category')->create();
    $category->delete();

    $this->actingAs($this->editor)
        ->delete("/admin/service-categories/{$category->id}/force")
        ->assertForbidden();

    $this->actingAs($this->admin)
        ->delete("/admin/service-categories/{$category->id}/force")
        ->assertSessionHas('success');

    expect(ServiceCategory::withTrashed()->count())->toBe(0)
        ->and($service->refresh()->category_id)->toBeNull();
});

test('reorder persists the whole set in one request', function () {
    $first = ServiceCategory::factory()->create(['sort_order' => 0]);
    $second = ServiceCategory::factory()->create(['sort_order' => 1]);

    $this->actingAs($this->editor)
        ->post('/admin/service-categories/reorder', [
            'categories' => [
                ['id' => $second->id, 'sort_order' => 0],
                ['id' => $first->id, 'sort_order' => 1],
            ],
        ])
        ->assertSessionHas('success');

    expect($first->refresh()->sort_order)->toBe(1)
        ->and($second->refresh()->sort_order)->toBe(0);
});
