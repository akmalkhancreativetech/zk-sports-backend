<?php

namespace App\Services;

use App\Models\Slide;
use App\Models\Slider;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Cache;

/**
 * The read path for rendering a slider (plan.md §4.4).
 *
 * `forKey()` is the cached, active-only lookup the public API will expose.
 * `payloadFor()` is the same shaping without the cache or the active check, so
 * the admin preview can show a draft slider before it goes live.
 *
 * Note: `CACHE_STORE=database` does not support tagging, so this invalidates by
 * explicit key from the model hooks rather than by tag.
 */
class PublicSliders
{
    public const TTL = 3600;

    public static function cacheKey(string $key): string
    {
        return "slider:{$key}";
    }

    /**
     * Cached lookup of an active slider by key. Null when missing or inactive.
     *
     * @return array<string, mixed>|null
     */
    public function forKey(string $key): ?array
    {
        return Cache::remember(self::cacheKey($key), self::TTL, function () use ($key) {
            $slider = Slider::query()
                ->active()
                // No Builder type hint: an eager-load constraint receives the
                // relation (HasMany), not a query builder.
                ->with(['slides' => fn (HasMany $slides) => $slides->live()->ordered()])
                ->firstWhere('key', $key);

            return $slider ? $this->payloadFor($slider) : null;
        });
    }

    /**
     * Shape a slider for rendering. Uncached, and indifferent to whether the
     * slider is active — the caller decides what it is allowed to see.
     *
     * @return array<string, mixed>
     */
    public function payloadFor(Slider $slider): array
    {
        $slider->loadMissing(['slides' => fn (HasMany $slides) => $slides->live()->ordered()]);

        return [
            'key' => $slider->key,
            'autoplay' => $slider->autoplay,
            'interval_ms' => $slider->interval_ms,
            'transition' => $slider->transition->value,
            'slides' => $slider->slides->map(fn (Slide $slide) => [
                'id' => $slide->id,
                'title' => $slide->title,
                'subtitle' => $slide->subtitle,
                'body' => $slide->body,
                'image_url' => $slide->imageUrl(),
                'mobile_image_url' => $slide->mobileImageUrl(),
                'image_alt' => $slide->image_alt,
                'cta_label' => $slide->cta_label,
                'cta_url' => $slide->cta_url,
                'cta_new_tab' => $slide->cta_new_tab,
                'text_position' => $slide->text_position->value,
                'overlay_opacity' => $slide->overlay_opacity,
            ])->values()->all(),
        ];
    }

    public static function forget(string $key): void
    {
        Cache::forget(self::cacheKey($key));
    }
}
