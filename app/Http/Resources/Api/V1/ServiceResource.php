<?php

namespace App\Http\Resources\Api\V1;

use App\Models\Service;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Service
 */
class ServiceResource extends JsonResource
{
    /**
     * Absent by design: `is_active` and `sort_order` (editorial, and already
     * applied by the query), and the raw `featured_image` / `og_image` storage
     * paths, which the client sees only as resolved URLs.
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

            /*
             * `description` is long-form HTML. Sending it for every card in a
             * paginated list would dwarf the rest of the payload, and `excerpt`
             * exists precisely so a list does not need it.
             */
            'description' => $this->when(
                $request->routeIs('api.v1.services.show'),
                fn () => $this->description,
            ),

            'icon' => $this->icon,
            'featured_image_url' => $this->featuredImageUrl(),
            'price_from' => $this->price_from,
            'price_unit' => $this->price_unit,
            'min_order_quantity' => $this->min_order_quantity,
            'is_featured' => $this->is_featured,

            'meta_title' => $this->meta_title,
            'meta_description' => $this->meta_description,
            'og_image_url' => $this->ogImageUrl(),

            'category' => ServiceCategoryResource::make($this->whenLoaded('category')),
            'images' => ServiceImageResource::collection($this->whenLoaded('images')),
            'options' => ServiceOptionResource::collection($this->whenLoaded('options')),
            'price_tiers' => ServicePriceTierResource::collection($this->whenLoaded('priceTiers')),
        ];
    }
}
