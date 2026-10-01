<?php

namespace App\Http\Resources\Api\V1;

use App\Models\ServiceCategory;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin ServiceCategory
 */
class ServiceCategoryResource extends JsonResource
{
    /**
     * `is_active` and `sort_order` are deliberately absent: the first is an
     * editorial flag the query already filters on, the second only decides the
     * order this collection arrives in.
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
            'services_count' => $this->whenCounted('services'),
        ];
    }
}
