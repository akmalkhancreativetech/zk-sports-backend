<?php

namespace App\Models;

use App\Enums\SliderTransition;
use App\Services\PublicSliders;
use Database\Factories\SliderFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

#[Fillable(['name', 'key', 'is_active', 'autoplay', 'interval_ms', 'transition'])]
class Slider extends Model
{
    /** @use HasFactory<SliderFactory> */
    use HasFactory;

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'autoplay' => 'boolean',
            'interval_ms' => 'integer',
            'transition' => SliderTransition::class,
        ];
    }

    protected static function booted(): void
    {
        // Keys are compared in PHP as well as at the unique index, and
        // utf8mb4_unicode_ci makes `Home_Hero` and `home_hero` collide at the
        // index but not in PHP. Normalise on write (plan.md §3.6 #2).
        static::saving(function (Slider $slider) {
            $slider->key = Str::lower(Str::slug($slider->key, '_'));
        });

        // Drop the public cache for the old key as well as the new one, so a
        // renamed key does not leave a stale entry serving the old content.
        $flush = function (Slider $slider) {
            PublicSliders::forget($slider->key);

            $previous = $slider->getOriginal('key');

            if ($previous && $previous !== $slider->key) {
                PublicSliders::forget($previous);
            }
        };

        static::saved($flush);
        static::deleted($flush);
    }

    /** @return HasMany<Slide, $this> */
    public function slides(): HasMany
    {
        return $this->hasMany(Slide::class);
    }

    #[Scope]
    protected function active(Builder $query): void
    {
        $query->where('is_active', true);
    }
}
