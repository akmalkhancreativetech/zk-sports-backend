<?php

namespace App\Http\Resources\Api\V1;

use App\Models\BlogPost;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin BlogPost
 */
class BlogPostResource extends JsonResource
{
    /**
     * Absent by design: `status` and the raw image paths, plus the author's
     * `email` — only a display name is exposed, and only where a byline needs
     * it. `body` follows the same list/detail split as a service description.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'slug' => $this->slug,
            'excerpt' => $this->excerpt,

            'body' => $this->when(
                $request->routeIs('api.v1.posts.show'),
                fn () => $this->body,
            ),

            'featured_image_url' => $this->featuredImageUrl(),
            'featured_image_alt' => $this->featured_image_alt,
            'og_image_url' => $this->ogImageUrl(),

            'published_at' => $this->published_at?->toIso8601String(),
            'is_featured' => $this->is_featured,

            'meta_title' => $this->meta_title,
            'meta_description' => $this->meta_description,

            'category' => BlogCategoryResource::make($this->whenLoaded('category')),
            'tags' => BlogTagResource::collection($this->whenLoaded('tags')),
            'author' => $this->whenLoaded('author', fn () => ['name' => $this->author->name]),
        ];
    }
}
