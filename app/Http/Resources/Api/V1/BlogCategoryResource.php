<?php

namespace App\Http\Resources\Api\V1;

use App\Models\BlogCategory;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin BlogCategory
 */
class BlogCategoryResource extends JsonResource
{
    /**
     * `posts_count` is only present when the query counted it, and that count
     * is constrained to live posts — a category whose only posts are drafts
     * must not advertise them.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'description' => $this->description,
            'posts_count' => $this->whenCounted('posts'),
        ];
    }
}
