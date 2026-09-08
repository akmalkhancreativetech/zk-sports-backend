<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['min_qty', 'max_qty', 'unit_price'])]
class ServicePriceTier extends Model
{
    protected function casts(): array
    {
        return [
            'min_qty' => 'integer',
            'max_qty' => 'integer',
            'unit_price' => 'decimal:2',
        ];
    }

    /** @return BelongsTo<Service, $this> */
    public function service(): BelongsTo
    {
        return $this->belongsTo(Service::class);
    }

    public function covers(int $quantity): bool
    {
        return $quantity >= $this->min_qty
            && ($this->max_qty === null || $quantity <= $this->max_qty);
    }

    public function rangeLabel(): string
    {
        return $this->max_qty === null
            ? "{$this->min_qty}+"
            : "{$this->min_qty}–{$this->max_qty}";
    }
}
