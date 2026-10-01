<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\Api\V1\BlogTagResource;
use App\Models\BlogTag;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class BlogTagController extends Controller
{
    /**
     * Tags with no live posts are dropped rather than returned with a zero
     * count: this list exists to be rendered as filter chips, and a chip that
     * leads to an empty result is a dead end.
     *
     * @return AnonymousResourceCollection<int, BlogTagResource>
     */
    public function index(): AnonymousResourceCollection
    {
        $tags = BlogTag::query()
            ->ordered()
            ->whereHas('posts', fn (Builder $posts) => $posts->live())
            ->withCount(['posts' => fn (Builder $posts) => $posts->live()])
            ->get();

        return BlogTagResource::collection($tags);
    }
}
