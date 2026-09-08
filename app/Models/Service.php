<?php

namespace App\Models;

use Database\Factories\ServiceFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

#[Fillable([
    'category_id',
    'title',
    'slug',
    'excerpt',
    'description',
    'icon',
    'featured_image',
    'price_from',
    'price_unit',
    'min_order_quantity',
    'is_featured',
    'is_active',
    'sort_order',
    'meta_title',
    'meta_description',
    'og_image',
])]
class Service extends Model
{
    /** @use HasFactory<ServiceFactory> */
    use HasFactory, SoftDeletes;

    protected function casts(): array
    {
        return [
            // decimal:2 keeps money as a string, so it never becomes a float
            // and never accumulates rounding error (plan.md §5.1).
            'price_from' => 'decimal:2',
            'min_order_quantity' => 'integer',
            'is_featured' => 'boolean',
            'is_active' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    protected static function booted(): void
    {
        static::saving(function (Service $service) {
            $service->slug = Str::lower(Str::slug($service->slug ?: $service->title));
        });
    }

    /** @return BelongsTo<ServiceCategory, $this> */
    public function category(): BelongsTo
    {
        return $this->belongsTo(ServiceCategory::class, 'category_id');
    }

    /** @return HasMany<ServiceImage, $this> */
    public function images(): HasMany
    {
        return $this->hasMany(ServiceImage::class)->orderBy('sort_order');
    }

    /** @return HasMany<ServiceOption, $this> */
    public function options(): HasMany
    {
        return $this->hasMany(ServiceOption::class)->orderBy('sort_order');
    }

    /** @return HasMany<ServicePriceTier, $this> */
    public function priceTiers(): HasMany
    {
        return $this->hasMany(ServicePriceTier::class)->orderBy('min_qty');
    }

    /**
     * Unit price for a quantity: the matching tier, else `price_from`, else null
     * for "on request". Tiers cannot overlap, so at most one matches.
     */
    public function unitPriceFor(int $quantity): ?string
    {
        $tier = $this->priceTiers->first(
            fn (ServicePriceTier $tier) => $tier->covers($quantity),
        );

        return $tier?->unit_price ?? $this->price_from;
    }

    #[Scope]
    protected function active(Builder $query): void
    {
        $query->where('is_active', true);
    }

    #[Scope]
    protected function featured(Builder $query): void
    {
        $query->where('is_featured', true);
    }

    #[Scope]
    protected function ordered(Builder $query): void
    {
        $query->orderBy('sort_order')->orderBy('id');
    }

    public function featuredImageUrl(): ?string
    {
        return $this->featured_image
            ? Storage::disk('public')->url($this->featured_image)
            : null;
    }

    public function ogImageUrl(): ?string
    {
        return $this->og_image ? Storage::disk('public')->url($this->og_image) : null;
    }
}
