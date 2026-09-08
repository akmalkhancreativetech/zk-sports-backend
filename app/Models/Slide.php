<?php

namespace App\Models;

use App\Enums\SlideTextPosition;
use App\Services\PublicSliders;
use Database\Factories\SlideFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

#[Fillable([
    'title',
    'subtitle',
    'body',
    'image_path',
    'mobile_image_path',
    'image_alt',
    'cta_label',
    'cta_url',
    'cta_new_tab',
    'text_position',
    'overlay_opacity',
    'sort_order',
    'is_active',
    'starts_at',
    'ends_at',
])]
class Slide extends Model
{
    /** @use HasFactory<SlideFactory> */
    use HasFactory;

    protected function casts(): array
    {
        return [
            'cta_new_tab' => 'boolean',
            'is_active' => 'boolean',
            'text_position' => SlideTextPosition::class,
            'overlay_opacity' => 'integer',
            'sort_order' => 'integer',
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        // A slide edit changes what the public slider renders, so the parent's
        // cached payload has to go too.
        $flush = function (Slide $slide) {
            $key = $slide->slider()->value('key');

            if ($key) {
                PublicSliders::forget($key);
            }
        };

        static::saved($flush);
        static::deleted($flush);
    }

    /** @return BelongsTo<Slider, $this> */
    public function slider(): BelongsTo
    {
        return $this->belongsTo(Slider::class);
    }

    /** Active and inside its scheduling window. */
    #[Scope]
    protected function live(Builder $query): void
    {
        $query->where('is_active', true)
            ->where(fn (Builder $q) => $q->whereNull('starts_at')->orWhere('starts_at', '<=', now()))
            ->where(fn (Builder $q) => $q->whereNull('ends_at')->orWhere('ends_at', '>=', now()));
    }

    #[Scope]
    protected function ordered(Builder $query): void
    {
        $query->orderBy('sort_order')->orderBy('id');
    }

    public function imageUrl(): ?string
    {
        return $this->image_path ? Storage::disk('public')->url($this->image_path) : null;
    }

    public function mobileImageUrl(): ?string
    {
        return $this->mobile_image_path
            ? Storage::disk('public')->url($this->mobile_image_path)
            : null;
    }
}
