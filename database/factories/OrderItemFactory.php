<?php

namespace Database\Factories;

use App\Models\OrderItem;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<OrderItem>
 */
class OrderItemFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'service_id' => null,
            'name' => fake()->randomElement([
                'Custom team jerseys',
                'Training bibs',
                'Match shorts',
                'Embroidered club badge',
                'Sublimated tracksuit',
                'Kit bag with name print',
            ]),
            'description' => fake()->boolean(50) ? fake()->sentence(8) : null,
            'quantity' => fake()->numberBetween(5, 60),
            'unit_price' => fake()->randomFloat(2, 500, 6000),
            // line_total is derived on save; see OrderItem::booted().
            'options' => fake()->boolean(50) ? [
                'size' => fake()->randomElement(['S', 'M', 'L', 'XL']),
                'colour' => fake()->safeColorName(),
            ] : null,
        ];
    }
}
