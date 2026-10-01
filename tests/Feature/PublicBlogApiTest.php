<?php

use App\Models\BlogCategory;
use App\Models\BlogPost;
use App\Models\BlogTag;
use App\Models\User;

/*
 * The public blog surface (docs/frontend-plan.md §4).
 *
 * Draft and scheduled posts are the whole risk here: a draft reachable by slug
 * is unpublished copy on the open internet, and a scheduled post leaking early
 * defeats the point of scheduling it.
 */

test('the index lists live posts newest first', function () {
    BlogPost::factory()->published()->create([
        'title' => 'Older',
        'published_at' => now()->subWeek(),
    ]);
    BlogPost::factory()->published()->create([
        'title' => 'Newer',
        'published_at' => now()->subDay(),
    ]);

    $response = $this->getJson('/api/v1/posts')
        ->assertOk()
        ->assertJsonStructure(['data', 'links', 'meta']);

    expect($response->json('data.*.title'))->toBe(['Newer', 'Older']);
});

test('the index hides drafts, scheduled and deleted posts', function () {
    BlogPost::factory()->published()->create(['title' => 'Live']);
    BlogPost::factory()->create(['title' => 'Draft']);
    BlogPost::factory()->scheduled()->create(['title' => 'Scheduled']);
    BlogPost::factory()->published()->create(['title' => 'Removed'])->delete();

    $response = $this->getJson('/api/v1/posts')->assertOk();

    expect($response->json('data.*.title'))->toBe(['Live']);
});

test('the index omits the post body and the editorial status', function () {
    BlogPost::factory()->published()->create(['body' => 'Long form copy']);

    $this->getJson('/api/v1/posts')
        ->assertOk()
        ->assertJsonMissingPath('data.0.body')
        ->assertJsonMissingPath('data.0.status');
});

test('the index filters by category slug', function () {
    $news = BlogCategory::factory()->create(['name' => 'News']);
    $guides = BlogCategory::factory()->create(['name' => 'Guides']);
    BlogPost::factory()->published()->for($news, 'category')->create(['title' => 'Kit launch']);
    BlogPost::factory()->published()->for($guides, 'category')->create(['title' => 'Sizing guide']);

    $response = $this->getJson('/api/v1/posts?category='.$news->slug)->assertOk();

    expect($response->json('data.*.title'))->toBe(['Kit launch']);
});

test('the index filters by tag slug', function () {
    $tag = BlogTag::factory()->create(['name' => 'Football']);
    BlogPost::factory()->published()->create(['title' => 'Tagged'])->tags()->attach($tag);
    BlogPost::factory()->published()->create(['title' => 'Untagged']);

    $response = $this->getJson('/api/v1/posts?tag='.$tag->slug)->assertOk();

    expect($response->json('data.*.title'))->toBe(['Tagged']);
});

test('a post is shown by slug with its body and byline', function () {
    $author = User::factory()->create(['name' => 'Akmal Khan']);
    $category = BlogCategory::factory()->create(['name' => 'News']);
    $tag = BlogTag::factory()->create(['name' => 'Football']);

    $post = BlogPost::factory()->published()->for($category, 'category')->create([
        'title' => 'Kit launch',
        'body' => 'Long form copy',
        'author_id' => $author->id,
    ]);
    $post->tags()->attach($tag);

    $this->getJson("/api/v1/posts/{$post->slug}")
        ->assertOk()
        ->assertJsonPath('data.body', 'Long form copy')
        ->assertJsonPath('data.category.name', 'News')
        ->assertJsonPath('data.tags.0.name', 'Football')
        ->assertJsonPath('data.author.name', 'Akmal Khan');
});

test('the byline never carries the author email', function () {
    $author = User::factory()->create(['email' => 'staff@zk-sports.com']);
    $post = BlogPost::factory()->published()->create(['author_id' => $author->id]);

    $response = $this->getJson("/api/v1/posts/{$post->slug}")->assertOk();

    expect($response->json('data.author'))->toBe(['name' => $author->name]);
});

test('a draft post is a 404 by slug', function () {
    $post = BlogPost::factory()->create();

    $this->getJson("/api/v1/posts/{$post->slug}")->assertNotFound();
});

test('a scheduled post is a 404 until its date arrives', function () {
    $post = BlogPost::factory()->scheduled()->create();

    $this->getJson("/api/v1/posts/{$post->slug}")->assertNotFound();
});

test('the category list counts only live posts', function () {
    $category = BlogCategory::factory()->create(['name' => 'News']);
    BlogPost::factory()->published()->for($category, 'category')->create();
    BlogPost::factory()->for($category, 'category')->create();

    $this->getJson('/api/v1/blog-categories')
        ->assertOk()
        ->assertJsonPath('data.0.name', 'News')
        ->assertJsonPath('data.0.posts_count', 1);
});

test('the tag list drops tags with no live posts', function () {
    $used = BlogTag::factory()->create(['name' => 'Football']);
    $draftOnly = BlogTag::factory()->create(['name' => 'Hockey']);
    BlogTag::factory()->create(['name' => 'Unused']);

    BlogPost::factory()->published()->create()->tags()->attach($used);
    BlogPost::factory()->create()->tags()->attach($draftOnly);

    $response = $this->getJson('/api/v1/blog-tags')->assertOk();

    expect($response->json('data.*.name'))->toBe(['Football']);
});
