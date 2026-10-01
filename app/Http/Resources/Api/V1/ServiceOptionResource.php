<?php

namespace App\Http\Resources\Api\V1;

use App\Models\ServiceOption;
use App\Models\ServiceOptionValue;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin ServiceOption
 */
class ServiceOptionResource extends JsonResource
{
    /**
     * Values are shaped inline rather than in their own Resource: they are only
     * ever reachable through an option, and three fields do not earn a file.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'type' => $this->type->value,
            'is_required' => $this->is_required,
            'values' => $this->whenLoaded(
                'values',
                fn () => $this->values->map(fn (ServiceOptionValue $value) => [
                    'id' => $value->id,
                    'label' => $value->label,
                    // decimal:2 cast — a string, so the client never inherits a
                    // float rounding error.
                    'price_delta' => $value->price_delta,
                ])->values()->all(),
            ),
        ];
    }
}
