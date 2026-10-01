<?php

namespace App\Http\Resources\Api\V1;

use App\Models\ServicePriceTier;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin ServicePriceTier
 */
class ServicePriceTierResource extends JsonResource
{
    /**
     * `range_label` ships alongside the raw bounds so the frontend renders the
     * same "10–49" / "50+" string the admin panel does, rather than
     * reimplementing the open-ended-tier rule in TypeScript.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'min_qty' => $this->min_qty,
            'max_qty' => $this->max_qty,
            'unit_price' => $this->unit_price,
            'range_label' => $this->rangeLabel(),
        ];
    }
}
