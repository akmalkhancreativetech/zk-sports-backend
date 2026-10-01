<?php

namespace Database\Factories;

use App\Enums\OrderStatus;
use App\Models\Order;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Order>
 */
class OrderFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            // Unique per run without a DB round-trip; the real numbering path
            // is Order::nextOrderNumber(), exercised by the seeder.
            'order_number' => sprintf('ORD-%d-%06d', now()->year, fake()->unique()->numberBetween(1, 999999)),
            'user_id' => null,
            'customer_name' => fake()->name(),
            'customer_email' => fake()->safeEmail(),
            'customer_phone' => fake()->numerify('03## #######'),
            'company' => fake()->boolean(40) ? fake()->company() : null,
            'status' => OrderStatus::New,
            'source' => fake()->randomElement(['website', 'phone', 'referral']),
            'assigned_to' => null,
            'currency' => 'PKR',
            'subtotal' => 0,
            'discount' => 0,
            'tax' => 0,
            'total' => 0,
            'customer_note' => fake()->boolean(60) ? fake()->sentence(12) : null,
            'internal_note' => null,
        ];
    }

    /**
     * Park the order at `$status` with the timestamps its journey would have
     * left behind, so a seeded board looks like one that was actually worked.
     */
    public function status(OrderStatus $status): static
    {
        return $this->state(fn () => [
            'status' => $status,
            'quoted_at' => in_array($status, [
                OrderStatus::Quoted,
                OrderStatus::Approved,
                OrderStatus::InProgress,
                OrderStatus::Completed,
                OrderStatus::Rejected,
            ], true) ? now()->subDays(5) : null,
            'approved_at' => in_array($status, [
                OrderStatus::Approved,
                OrderStatus::InProgress,
                OrderStatus::Completed,
            ], true) ? now()->subDays(3) : null,
            'completed_at' => $status === OrderStatus::Completed ? now()->subDay() : null,
        ]);
    }
}
