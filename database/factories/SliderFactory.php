<?php

namespace Database\Factories;

use App\Enums\SliderTransition;
use App\Models\Slider;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Slider>
 */
class SliderFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $name = fake()->unique()->words(2, true);

        return [
            'name' => Str::title($name),
            'key' => Str::lower(Str::slug($name, '_')),
            'is_active' => true,
            'autoplay' => true,
            'interval_ms' => 5000,
            'transition' => SliderTransition::Slide,
        ];
    }

    public function inactive(): static
    {
        return $this->state(fn () => ['is_active' => false]);
    }

    public function homeHero(): static
    {
        return $this->state(fn () => [
            'name' => 'Home Hero',
            'key' => 'home_hero',
        ]);
    }
}
