<?php

namespace Database\Factories;

use App\Enums\SlideTextPosition;
use App\Models\Slide;
use App\Models\Slider;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Slide>
 */
class SlideFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'slider_id' => Slider::factory(),
            'title' => fake()->sentence(3),
            'subtitle' => fake()->sentence(6),
            'body' => null,
            'image_path' => 'sliders/'.fake()->uuid().'.webp',
            'mobile_image_path' => null,
            'image_alt' => fake()->sentence(4),
            'cta_label' => null,
            'cta_url' => null,
            'cta_new_tab' => false,
            'text_position' => SlideTextPosition::Left,
            'overlay_opacity' => 40,
            'sort_order' => 0,
            'is_active' => true,
            'starts_at' => null,
            'ends_at' => null,
        ];
    }

    public function inactive(): static
    {
        return $this->state(fn () => ['is_active' => false]);
    }

    /** Scheduled to start in the future, so it is not yet live. */
    public function scheduled(): static
    {
        return $this->state(fn () => ['starts_at' => now()->addWeek()]);
    }

    /** Its window has already closed. */
    public function expired(): static
    {
        return $this->state(fn () => [
            'starts_at' => now()->subMonth(),
            'ends_at' => now()->subWeek(),
        ]);
    }
}
