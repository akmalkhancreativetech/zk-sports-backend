<?php

namespace App\Models;

use Database\Factories\OrderItemFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'order_id',
    'service_id',
    'name',
    'description',
    'quantity',
    'unit_price',
    'line_total',
    'options',
])]
class OrderItem extends Model
{
    /** @use HasFactory<OrderItemFactory> */
    use HasFactory;

    protected function casts(): array
    {
        return [
            'quantity' => 'integer',
            'unit_price' => 'decimal:2',
            'line_total' => 'decimal:2',
            'options' => 'array',
        ];
    }

    protected static function booted(): void
    {
        // Derived, never posted: a client-supplied line_total is an invitation
        // to send quantity 10 at unit 100 with a total of 1.
        static::saving(function (OrderItem $item) {
            $item->line_total = (float) $item->unit_price * $item->quantity;
        });
    }

    /** @return BelongsTo<Order, $this> */
    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    /** Null once the service is deleted; `name` carries the snapshot. */
    public function service(): BelongsTo
    {
        return $this->belongsTo(Service::class);
    }
}
