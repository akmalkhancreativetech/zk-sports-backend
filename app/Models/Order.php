<?php

namespace App\Models;

use App\Enums\OrderStatus;
use Database\Factories\OrderFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\DB;

#[Fillable([
    'order_number',
    'user_id',
    'customer_name',
    'customer_email',
    'customer_phone',
    'company',
    'status',
    'source',
    'assigned_to',
    'currency',
    'subtotal',
    'discount',
    'tax',
    'total',
    'customer_note',
    'internal_note',
    'quoted_at',
    'approved_at',
    'completed_at',
])]
class Order extends Model
{
    /** @use HasFactory<OrderFactory> */
    use HasFactory, SoftDeletes;

    protected function casts(): array
    {
        return [
            'status' => OrderStatus::class,
            'subtotal' => 'decimal:2',
            'discount' => 'decimal:2',
            'tax' => 'decimal:2',
            'total' => 'decimal:2',
            'quoted_at' => 'datetime',
            'approved_at' => 'datetime',
            'completed_at' => 'datetime',
        ];
    }

    /** @return HasMany<OrderItem, $this> */
    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    /** @return HasMany<OrderStatusHistory, $this> */
    public function statusHistories(): HasMany
    {
        return $this->hasMany(OrderStatusHistory::class);
    }

    /** @return BelongsTo<User, $this> */
    public function customer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /** @return BelongsTo<User, $this> */
    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    /** Awaiting first triage — the count behind the sidebar badge. */
    #[Scope]
    protected function awaitingTriage(Builder $query): void
    {
        $query->where('status', OrderStatus::New);
    }

    /**
     * Recalculate money from the line items. plan.md §7.3: the client total is
     * display only, so every write routes through here rather than trusting a
     * posted subtotal.
     *
     * `discount` and `tax` are staff-entered and preserved; only `subtotal` and
     * `total` are derived.
     */
    public function recalculateTotals(): void
    {
        $subtotal = $this->items()->sum('line_total');

        $this->subtotal = $subtotal;
        $this->total = max(0, $subtotal - (float) $this->discount + (float) $this->tax);
        $this->save();
    }

    /**
     * The next `ORD-{year}-{000123}` for the current year.
     *
     * Called inside the caller's transaction with a locking read, so two
     * concurrent submissions cannot land on the same number and trip the unique
     * index. Numbering restarts each year by design.
     */
    public static function nextOrderNumber(): string
    {
        $year = now()->year;
        $prefix = "ORD-{$year}-";

        $last = static::withTrashed()
            ->where('order_number', 'like', "{$prefix}%")
            ->lockForUpdate()
            ->orderByDesc('order_number')
            ->value('order_number');

        $sequence = $last ? ((int) substr($last, strlen($prefix))) + 1 : 1;

        return $prefix.str_pad((string) $sequence, 6, '0', STR_PAD_LEFT);
    }

    /**
     * Move to `$target`, recording the change. Returns false when the graph
     * forbids the move, so callers can 422 rather than silently no-op.
     *
     * The history row and the status write share one transaction: a timeline
     * that disagrees with the order's own status is worse than a failed write.
     */
    public function transitionTo(OrderStatus $target, ?User $actor = null, ?string $note = null): bool
    {
        if (! $this->status->canTransitionTo($target)) {
            return false;
        }

        DB::transaction(function () use ($target, $actor, $note) {
            $from = $this->status;

            $this->status = $target;

            if ($column = $target->timestampColumn()) {
                $this->{$column} = now();
            }

            $this->save();

            $this->statusHistories()->create([
                'from_status' => $from->value,
                'to_status' => $target->value,
                'user_id' => $actor?->id,
                'note' => $note,
            ]);
        });

        return true;
    }
}
