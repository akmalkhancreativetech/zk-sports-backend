<?php

namespace App\Models;

use App\Enums\ServiceOptionType;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['name', 'type', 'is_required', 'sort_order'])]
class ServiceOption extends Model
{
    protected function casts(): array
    {
        return [
            'type' => ServiceOptionType::class,
            'is_required' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    /** @return BelongsTo<Service, $this> */
    public function service(): BelongsTo
    {
        return $this->belongsTo(Service::class);
    }

    /** @return HasMany<ServiceOptionValue, $this> */
    public function values(): HasMany
    {
        return $this->hasMany(ServiceOptionValue::class)->orderBy('sort_order');
    }
}
