<?php

use App\Enums\PostStatus;
use App\Models\BlogCategory;
use App\Models\BlogPost;
use App\Models\BlogTag;
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
function postPayload(array $overrides = []): array
{
    return [
        'title' => 'Match Report',
        'slug' => 'match-report',
        'status' => 'draft',
        'is_featured' => false,
        ...$overrides,
    ];
}

test('guests cannot reach the posts admin', function () {
    $this->get('/admin/blog/posts')->assertRedirect('/login');
});

test('index lists posts with category, author and tag counts', function () {
    $category = BlogCategory::factory()->create(['name' => 'News']);
    $post = BlogPost::factory()
        ->for($category, 'category')
        ->create(['title' => 'Season Opener', 'author_id' => $this->editor->id]);
    $post->tags()->attach(BlogTag::factory()->count(2)->create());

    $this->actingAs($this->editor)
        ->get('/admin/blog/posts')
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('admin/blog/posts/index')
            ->has('posts.data', 1)
            ->where('posts.data.0.title', 'Season Opener')
            ->where('posts.data.0.category', 'News')
            ->where('posts.data.0.author', $this->editor->name)
            ->where('posts.data.0.tags_count', 2)
            ->has('categories', 1)
        );
});

test('a post can be created and records its author', function () {
    $this->actingAs($this->editor)
        ->post('/admin/blog/posts', postPayload())
        ->assertRedirect()
        ->assertSessionHas('success');

    $post = BlogPost::sole();

    expect($post->slug)->toBe('match-report')
        ->and($post->author_id)->toBe($this->editor->id)
        ->and($post->status)->toBe(PostStatus::Draft);
});

test('the slug is derived from the title when omitted', function () {
    $payload = postPayload();
    unset($payload['slug']);

    $this->actingAs($this->editor)->post('/admin/blog/posts', $payload);

    expect(BlogPost::sole()->slug)->toBe('match-report');
});

test('a soft-deleted post still holds its slug', function () {
    $post = BlogPost::factory()->create(['slug' => 'match-report']);
    $post->delete();

    $this->actingAs($this->editor)
        ->post('/admin/blog/posts', postPayload())
        ->assertSessionHasErrors('slug');
});

test('publishing without a date stamps the moment it went live', function () {
    $this->actingAs($this->editor)
        ->post('/admin/blog/posts', postPayload(['status' => 'published']));

    expect(BlogPost::sole()->published_at)->not->toBeNull();
});

test('a future publish date leaves the post scheduled rather than live', function () {
    $this->actingAs($this->editor)->post('/admin/blog/posts', postPayload([
        'status' => 'published',
        'published_at' => now()->addWeek()->format('Y-m-d\TH:i'),
    ]));

    $post = BlogPost::sole();

    expect($post->isScheduled())->toBeTrue()
        ->and(BlogPost::live()->count())->toBe(0);
});

test('tags are synced on save', function () {
    $tags = BlogTag::factory()->count(3)->create();

    $this->actingAs($this->editor)->post('/admin/blog/posts', postPayload([
        'tags' => $tags->take(2)->pluck('id')->all(),
    ]));

    $post = BlogPost::sole();

    expect($post->tags)->toHaveCount(2);

    $this->actingAs($this->editor)->put("/admin/blog/posts/{$post->id}", postPayload([
        'tags' => [$tags->last()->id],
    ]));

    expect($post->refresh()->tags->pluck('id')->all())->toBe([$tags->last()->id]);
});

test('alt text is required once a featured image is present', function () {
    $this->actingAs($this->editor)
        ->post('/admin/blog/posts', postPayload([
            'featured_image' => UploadedFile::fake()->image('kit.jpg', 1200, 800),
        ]))
        ->assertSessionHasErrors('featured_image_alt');

    $this->actingAs($this->editor)
        ->post('/admin/blog/posts', postPayload([
            'featured_image' => UploadedFile::fake()->image('kit.jpg', 1200, 800),
            'featured_image_alt' => 'The first XI walking out.',
        ]))
        ->assertSessionHasNoErrors();

    expect(BlogPost::sole()->featured_image)->toEndWith('.webp');
});

test('the status filter separates published, scheduled and drafts', function () {
    BlogPost::factory()->published()->create(['title' => 'Live']);
    BlogPost::factory()->scheduled()->create(['title' => 'Later']);
    BlogPost::factory()->create(['title' => 'Draft']);

    $expect = function (string $status, string $title) {
        $this->actingAs($this->editor)
            ->get("/admin/blog/posts?status={$status}")
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->has('posts.data', 1)
                ->where('posts.data.0.title', $title)
            );
    };

    $expect('published', 'Live');
    $expect('scheduled', 'Later');
    $expect('draft', 'Draft');
});

test('deleting a post only soft deletes it', function () {
    $post = BlogPost::factory()->create();

    $this->actingAs($this->editor)
        ->delete("/admin/blog/posts/{$post->id}")
        ->assertForbidden();

    $this->actingAs($this->admin)
        ->delete("/admin/blog/posts/{$post->id}")
        ->assertRedirect('/admin/blog/posts');

    expect(BlogPost::count())->toBe(0)
        ->and(BlogPost::withTrashed()->count())->toBe(1);
});

test('an admin can restore a trashed post', function () {
    $post = BlogPost::factory()->create();
    $post->delete();

    $this->actingAs($this->editor)
        ->put("/admin/blog/posts/{$post->id}/restore")
        ->assertForbidden();

    $this->actingAs($this->admin)
        ->put("/admin/blog/posts/{$post->id}/restore")
        ->assertSessionHas('success');

    expect(BlogPost::count())->toBe(1);
});

test('force deleting a post removes its rows, tag links and image files', function () {
    $this->actingAs($this->editor)->post('/admin/blog/posts', postPayload([
        'featured_image' => UploadedFile::fake()->image('kit.jpg', 800, 600),
        'featured_image_alt' => 'Alt text.',
    ]));

    $post = BlogPost::sole();
    $featured = $post->featured_image;
    $post->tags()->attach(BlogTag::factory()->create());
    $post->delete();

    $this->actingAs($this->admin)
        ->delete("/admin/blog/posts/{$post->id}/force")
        ->assertSessionHas('success');

    expect(BlogPost::withTrashed()->count())->toBe(0)
        ->and(DB::table('blog_post_tag')->count())->toBe(0);

    Storage::disk('public')->assertMissing($featured);
});

test('bulk publish stamps a date and bulk draft hides the post again', function () {
    $posts = BlogPost::factory()->count(2)->create();
    $ids = $posts->pluck('id')->all();

    $this->actingAs($this->editor)
        ->post('/admin/blog/posts/bulk', ['action' => 'publish', 'ids' => $ids])
        ->assertSessionHas('success');

    expect(BlogPost::live()->count())->toBe(2);

    $this->actingAs($this->editor)
        ->post('/admin/blog/posts/bulk', ['action' => 'draft', 'ids' => $ids]);

    expect(BlogPost::live()->count())->toBe(0);
});

test('bulk restore and bulk force delete act on trashed posts', function () {
    $posts = BlogPost::factory()->count(2)->create();
    $posts->each->delete();
    $ids = $posts->pluck('id')->all();

    $this->actingAs($this->admin)
        ->post('/admin/blog/posts/bulk', ['action' => 'restore', 'ids' => $ids]);

    expect(BlogPost::count())->toBe(2);

    BlogPost::query()->get()->each->delete();

    $this->actingAs($this->admin)
        ->post('/admin/blog/posts/bulk', ['action' => 'force-delete', 'ids' => $ids]);

    expect(BlogPost::withTrashed()->count())->toBe(0);
});

test('deleting a category leaves its posts uncategorised only once purged', function () {
    $category = BlogCategory::factory()->create();
    $post = BlogPost::factory()->for($category, 'category')->create();

    $this->actingAs($this->admin)->delete("/admin/blog/categories/{$category->id}");

    expect($post->refresh()->category_id)->toBe($category->id);

    $this->actingAs($this->admin)->delete("/admin/blog/categories/{$category->id}/force");

    expect($post->refresh()->category_id)->toBeNull();
});
