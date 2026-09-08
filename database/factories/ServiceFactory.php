<?php

namespace Database\Factories;

use App\Models\Service;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Service>
 */
class ServiceFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $title = fake()->unique()->words(3, true);

        return [
            'category_id' => null,
            'title' => Str::title($title),
            'slug' => Str::lower(Str::slug($title)),
            'excerpt' => fake()->sentence(10),
            'description' => fake()->paragraph(),
            'icon' => null,
            'featured_image' => null,
            'price_from' => null,
            'price_unit' => null,
            'is_featured' => false,
            'is_active' => true,
            'sort_order' => 0,
            'meta_title' => null,
            'meta_description' => null,
            'og_image' => null,
        ];
    }

    public function inactive(): static
    {
        return $this->state(fn () => ['is_active' => false]);
    }

    public function featured(): static
    {
        return $this->state(fn () => ['is_featured' => true]);
    }

    public function priced(): static
    {
        return $this->state(fn () => [
            'price_from' => 2500.00,
            'price_unit' => 'per kit',
        ]);
    }
}
