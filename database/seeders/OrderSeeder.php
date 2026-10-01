<?php

namespace Database\Seeders;

use App\Enums\OrderStatus;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Service;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * A worked board rather than a uniform pile: orders spread across the workflow,
 * each with line items, real totals and a status history consistent with where
 * it ended up.
 *
 * Until the Next.js site can submit orders, this is the only thing that creates
 * them, so it is also where the real numbering path gets exercised.
 */
class OrderSeeder extends Seeder
{
    /** How many orders to leave in each status. */
    private const SPREAD = [
        'new' => 6,
        'reviewing' => 3,
        'quoted' => 4,
        'approved' => 2,
        'in_progress' => 3,
        'completed' => 5,
        'cancelled' => 2,
        'rejected' => 1,
    ];

    public function run(): void
    {
        $staff = User::query()->get();
        $services = Service::query()->get(['id', 'title']);

        foreach (self::SPREAD as $status => $count) {
            $case = OrderStatus::from($status);

            for ($i = 0; $i < $count; $i++) {
                DB::transaction(function () use ($case, $staff, $services) {
                    $order = Order::factory()
                        ->status($case)
                        ->create([
                            'order_number' => Order::nextOrderNumber(),
                            'assigned_to' => $case === OrderStatus::New
                                ? null
                                : $staff->random()?->id,
                            'created_at' => now()->subDays(random_int(0, 45)),
                        ]);

                    OrderItem::factory()
                        ->count(random_int(1, 4))
                        ->for($order)
                        ->create($this->serviceLink($services));

                    // Staff-entered adjustments on the orders far enough along
                    // to have been quoted.
                    if ($case->timestampColumn() !== null || $case === OrderStatus::Rejected) {
                        $order->discount = random_int(0, 3) * 500;
                    }

                    $order->recalculateTotals();

                    $this->seedHistory($order, $case, $staff);
                });
            }
        }
    }

    /**
     * Point roughly half the lines at a real service, leaving the rest as
     * free-text — which is what a quotation workflow actually produces.
     *
     * @param  Collection<int, Service>  $services
     * @return array<string, mixed>
     */
    private function serviceLink($services): array
    {
        if ($services->isEmpty() || random_int(0, 1) === 0) {
            return [];
        }

        $service = $services->random();

        return ['service_id' => $service->id, 'name' => $service->title];
    }

    /**
     * Walk the order from `new` to where it sits, writing the history the real
     * transitions would have written. Uses the enum's own graph, so a seeded
     * timeline can never contain a move the workflow forbids.
     */
    private function seedHistory(Order $order, OrderStatus $target, $staff): void
    {
        $order->statusHistories()->create([
            'from_status' => null,
            'to_status' => OrderStatus::New->value,
            'user_id' => null,
            'note' => 'Submitted from the website.',
            'created_at' => $order->created_at,
        ]);

        $current = OrderStatus::New;
        $at = $order->created_at->copy();

        while ($current !== $target) {
            $next = $this->stepToward($current, $target);

            if ($next === null) {
                break;
            }

            $at = $at->addHours(random_int(4, 36));

            $order->statusHistories()->create([
                'from_status' => $current->value,
                'to_status' => $next->value,
                'user_id' => $staff->random()?->id,
                'note' => null,
                'created_at' => $at,
            ]);

            $current = $next;
        }
    }

    /**
     * The next hop from `$current` toward `$target`, or null if unreachable.
     *
     * Terminal states sit off the happy path, so they are taken directly the
     * moment they are legal; otherwise follow the first non-terminal edge.
     */
    private function stepToward(OrderStatus $current, OrderStatus $target): ?OrderStatus
    {
        $transitions = $current->allowedTransitions();

        if (in_array($target, $transitions, true)) {
            return $target;
        }

        foreach ($transitions as $candidate) {
            if (! $candidate->isTerminal()) {
                return $candidate;
            }
        }

        return null;
    }
}
