<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\Api\V1\BlogPostResource;
use App\Models\BlogPost;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class BlogPostController extends Controller
{
    public const PER_PAGE = 12;

    /**
     * The `live` scope is the whole visibility rule: published status, and a
     * `published_at` that has actually arrived. A scheduled post is invisible
     * here until its date passes.
     *
     * @return AnonymousResourceCollection<int, BlogPostResource>
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $posts = BlogPost::query()
            ->live()
            ->latest('published_at')
            ->with(['category', 'tags'])
            ->when(
                $request->string('category')->trim()->value(),
                fn (Builder $query, string $slug) => $query->whereHas(
                    'category',
                    fn (Builder $category) => $category->where('slug', $slug),
                ),
            )
            ->when(
                $request->string('tag')->trim()->value(),
                fn (Builder $query, string $slug) => $query->whereHas(
                    'tags',
                    fn (Builder $tag) => $tag->where('slug', $slug),
                ),
            )
            ->paginate(self::PER_PAGE)
            ->withQueryString();

        return BlogPostResource::collection($posts);
    }

    public function show(string $slug): BlogPostResource
    {
        $post = BlogPost::query()
            ->live()
            ->with(['category', 'tags', 'author'])
            ->where('slug', $slug)
            ->firstOrFail();

        return BlogPostResource::make($post);
    }
}
