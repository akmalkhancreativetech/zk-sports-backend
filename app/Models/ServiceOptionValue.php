<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['label', 'price_delta', 'sort_order'])]
class ServiceOptionValue extends Model
{
    protected function casts(): array
    {
        return [
            // Kept as a string so it never becomes a float.
            'price_delta' => 'decimal:2',
            'sort_order' => 'integer',
        ];
    }

    /** @return BelongsTo<ServiceOption, $this> */
    public function option(): BelongsTo
    {
        return $this->belongsTo(ServiceOption::class, 'service_option_id');
    }
}
