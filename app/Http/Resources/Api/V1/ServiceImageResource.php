<?php

namespace App\Http\Resources\Api\V1;

use App\Models\ServiceImage;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin ServiceImage
 */
class ServiceImageResource extends JsonResource
{
    /**
     * The storage `path` never leaves the server — the client gets a URL. The
     * relation is already ordered, so `sort_order` would be redundant.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'url' => $this->url(),
            'alt' => $this->alt,
        ];
    }
}
