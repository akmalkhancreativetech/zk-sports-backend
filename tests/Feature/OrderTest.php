<?php

use App\Enums\OrderStatus;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\User;
use Inertia\Testing\AssertableInertia;

beforeEach(function () {
    $this->editor = User::factory()->create();
    $this->admin = User::factory()->admin()->create();
});

test('guests cannot reach the orders admin', function () {
    $this->get('/admin/orders')->assertRedirect('/login');
});

test('index lists orders with assignee and item counts', function () {
    $order = Order::factory()
        ->create(['customer_name' => 'Imran Ali', 'assigned_to' => $this->editor->id]);

    OrderItem::factory()->count(2)->for($order)->create();

    $this->actingAs($this->editor)
        ->get('/admin/orders')
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('admin/orders/index')
            ->has('orders.data', 1)
            ->where('orders.data.0.customer_name', 'Imran Ali')
            ->where('orders.data.0.assignee', $this->editor->name)
            ->where('orders.data.0.items_count', 2)
            ->where('orders.data.0.status', 'new')
            ->has('statusCounts')
            ->has('statuses', count(OrderStatus::cases()))
        );
});

test('index can be filtered by status', function () {
    Order::factory()->status(OrderStatus::Completed)->create();
    Order::factory()->create();

    $this->actingAs($this->editor)
        ->get('/admin/orders?status=completed')
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->has('orders.data', 1)
            ->where('orders.data.0.status', 'completed')
        );
});

test('index can be searched by order number, name, email or company', function (string $term) {
    Order::factory()->create([
        'order_number' => 'ORD-2026-000042',
        'customer_name' => 'Sana Khan',
        'customer_email' => 'sana@example.test',
        'company' => 'Falcon Sports',
    ]);
    Order::factory()->create(['customer_name' => 'Someone Else']);

    $this->actingAs($this->editor)
        ->get('/admin/orders?search='.urlencode($term))
        ->assertInertia(fn (AssertableInertia $page) => $page->has('orders.data', 1));
})->with(['000042', 'Sana', 'sana@example.test', 'Falcon']);

test('index rejects an arbitrary sort column', function () {
    $this->actingAs($this->editor)
        ->get('/admin/orders?sort=internal_note')
        ->assertSessionHasErrors('sort');
});

test('index accepts a whitelisted sort column', function () {
    $this->actingAs($this->editor)
        ->get('/admin/orders?sort=total&direction=asc')
        ->assertOk();
});

test('the show page exposes items, timeline and only legal transitions', function () {
    $order = Order::factory()->create();
    OrderItem::factory()->for($order)->create(['name' => 'Custom team jerseys']);
    $order->transitionTo(OrderStatus::Reviewing, $this->editor);

    $this->actingAs($this->editor)
        ->get("/admin/orders/{$order->id}")
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('admin/orders/show')
            ->where('order.status', 'reviewing')
            ->has('items', 1)
            ->where('items.0.name', 'Custom team jerseys')
            ->has('timeline', 1)
            // Reviewing → quoted | cancelled, and nothing else.
            ->has('allowedTransitions', 2)
        );
});

test('the internal note is never exposed on the index', function () {
    Order::factory()->create(['internal_note' => 'Chase the deposit.']);

    $this->actingAs($this->editor)
        ->get('/admin/orders')
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->missing('orders.data.0.internal_note')
        );
});

test('a legal status change is recorded in the timeline', function () {
    $order = Order::factory()->create();

    $this->actingAs($this->editor)
        ->post("/admin/orders/{$order->id}/status", [
            'status' => 'reviewing',
            'note' => 'Picked this up.',
        ])
        ->assertRedirect()
        ->assertSessionHas('success');

    expect($order->fresh()->status)->toBe(OrderStatus::Reviewing);

    $history = $order->statusHistories()->sole();

    expect($history->from_status)->toBe(OrderStatus::New)
        ->and($history->to_status)->toBe(OrderStatus::Reviewing)
        ->and($history->user_id)->toBe($this->editor->id)
        ->and($history->note)->toBe('Picked this up.');
});

test('an illegal status change is rejected and changes nothing', function () {
    $order = Order::factory()->create();

    $this->actingAs($this->editor)
        ->post("/admin/orders/{$order->id}/status", ['status' => 'completed'])
        ->assertSessionHasErrors('status');

    expect($order->fresh()->status)->toBe(OrderStatus::New)
        ->and($order->statusHistories()->count())->toBe(0);
});

test('an unknown status is rejected by validation', function () {
    $order = Order::factory()->create();

    $this->actingAs($this->editor)
        ->post("/admin/orders/{$order->id}/status", ['status' => 'refunded'])
        ->assertSessionHasErrors('status');
});

test('entering quoted, approved or completed stamps its timestamp', function () {
    $order = Order::factory()->create();

    $order->transitionTo(OrderStatus::Reviewing, $this->editor);
    $order->transitionTo(OrderStatus::Quoted, $this->editor);

    expect($order->fresh()->quoted_at)->not->toBeNull()
        ->and($order->fresh()->approved_at)->toBeNull();
});

test('a terminal order offers no further transitions', function () {
    expect(OrderStatus::Completed->allowedTransitions())->toBe([])
        ->and(OrderStatus::Completed->isTerminal())->toBeTrue()
        ->and(OrderStatus::Completed->canTransitionTo(OrderStatus::New))->toBeFalse();
});

test('updating an order replaces its items and recalculates totals', function () {
    $order = Order::factory()->create();
    OrderItem::factory()->for($order)->create();

    $this->actingAs($this->editor)
        ->patch("/admin/orders/{$order->id}", [
            'internal_note' => 'Deposit received.',
            'discount' => 500,
            'tax' => 0,
            'items' => [
                ['name' => 'Match shorts', 'quantity' => 10, 'unit_price' => 1200],
                ['name' => 'Kit bag', 'quantity' => 2, 'unit_price' => 2500],
            ],
        ])
        ->assertRedirect()
        ->assertSessionHas('success');

    $order->refresh();

    // 10×1200 + 2×2500 = 17000, less the 500 discount.
    expect($order->items)->toHaveCount(2)
        ->and((float) $order->subtotal)->toBe(17000.0)
        ->and((float) $order->total)->toBe(16500.0)
        ->and($order->internal_note)->toBe('Deposit received.');
});

test('a posted line total is ignored in favour of quantity times unit price', function () {
    $order = Order::factory()->create();

    $this->actingAs($this->editor)->patch("/admin/orders/{$order->id}", [
        'items' => [
            ['name' => 'Jerseys', 'quantity' => 10, 'unit_price' => 1000, 'line_total' => 1],
        ],
    ]);

    expect((float) $order->fresh()->items()->sole()->line_total)->toBe(10000.0);
});

test('an order update is rejected when a line is incomplete', function () {
    $order = Order::factory()->create();

    $this->actingAs($this->editor)
        ->patch("/admin/orders/{$order->id}", [
            'items' => [['name' => '', 'quantity' => 0, 'unit_price' => -5]],
        ])
        ->assertSessionHasErrors(['items.0.name', 'items.0.quantity', 'items.0.unit_price']);
});

test('an editor cannot delete an order', function () {
    $order = Order::factory()->create();

    $this->actingAs($this->editor)
        ->delete("/admin/orders/{$order->id}")
        ->assertForbidden();

    expect(Order::count())->toBe(1);
});

test('an admin can delete an order', function () {
    $order = Order::factory()->create();

    $this->actingAs($this->admin)
        ->delete("/admin/orders/{$order->id}")
        ->assertRedirect('/admin/orders')
        ->assertSessionHas('success');

    expect(Order::count())->toBe(0)
        ->and(Order::withTrashed()->count())->toBe(1);
});

test('order numbers are sequential within the year', function () {
    $first = Order::factory()->create(['order_number' => Order::nextOrderNumber()]);
    $second = Order::factory()->create(['order_number' => Order::nextOrderNumber()]);

    $year = now()->year;

    expect($first->order_number)->toBe("ORD-{$year}-000001")
        ->and($second->order_number)->toBe("ORD-{$year}-000002");
});

test('the sidebar badge counts only orders awaiting triage', function () {
    Order::factory()->count(3)->create();
    Order::factory()->status(OrderStatus::Completed)->create();

    $this->actingAs($this->editor)
        ->get('/admin/orders')
        ->assertInertia(fn (AssertableInertia $page) => $page->where('newOrdersCount', 3));
});
