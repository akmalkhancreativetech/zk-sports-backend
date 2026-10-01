<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\Api\V1\BlogCategoryResource;
use App\Models\BlogCategory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class BlogCategoryController extends Controller
{
    /**
     * @return AnonymousResourceCollection<int, BlogCategoryResource>
     */
    public function index(): AnonymousResourceCollection
    {
        $categories = BlogCategory::query()
            ->active()
            ->ordered()
            ->withCount(['posts' => fn (Builder $posts) => $posts->live()])
            ->get();

        return BlogCategoryResource::collection($categories);
    }
}
