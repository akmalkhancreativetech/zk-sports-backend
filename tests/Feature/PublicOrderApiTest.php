<?php

use App\Enums\OrderStatus;
use App\Enums\UserRole;
use App\Models\Order;
use App\Models\Service;
use App\Models\User;
use App\Notifications\NewOrderSubmitted;
use Illuminate\Support\Facades\Notification;

/*
 * The public quotation intake (plan.md §7) — the only write on the v1 API.
 *
 * The assertions that matter most are the ones about what the *server* decides.
 * This endpoint is unauthenticated, so anything it takes from the payload is
 * something a stranger controls: the price, the status and the line name are
 * therefore asserted to ignore what was posted.
 */

/** @return array<string, mixed> */
function enquiry(array $overrides = []): array
{
    return array_merge([
        'customer_name' => 'Aisha Khan',
        'customer_email' => 'aisha@example.com',
        'customer_phone' => '+44 7700 900000',
        'items' => [['service_id' => Service::factory()->create()->id, 'quantity' => 25]],
    ], $overrides);
}

test('a visitor can submit an enquiry', function () {
    $service = Service::factory()->create(['title' => 'Custom Jersey']);

    $this->postJson('/api/v1/orders', enquiry([
        'company' => 'Riverside FC',
        'customer_note' => 'Sublimated, club crest on the chest.',
        'items' => [['service_id' => $service->id, 'quantity' => 25]],
    ]))
        ->assertCreated()
        ->assertJsonPath('data.order_number', fn (string $number) => str_starts_with($number, 'ORD-'));

    $order = Order::sole();

    expect($order->customer_name)->toBe('Aisha Khan')
        ->and($order->company)->toBe('Riverside FC')
        ->and($order->status)->toBe(OrderStatus::New)
        ->and($order->source)->toBe('website');

    expect($order->items()->sole())
        ->name->toBe('Custom Jersey')
        ->quantity->toBe(25);
});

test('the response exposes only the order number', function () {
    // The record carries `internal_note` and `assigned_to`; echoing it back
    // would publish both to whoever submitted the form.
    $this->postJson('/api/v1/orders', enquiry())
        ->assertCreated()
        ->assertExactJson(['data' => ['order_number' => Order::sole()->order_number]]);
});

test('a posted price is ignored', function () {
    $service = Service::factory()->create();

    $this->postJson('/api/v1/orders', enquiry([
        'items' => [[
            'service_id' => $service->id,
            'quantity' => 10,
            'unit_price' => 1,
            'line_total' => 1,
        ]],
        'subtotal' => 1,
        'total' => 1,
        'discount' => 500,
    ]))->assertCreated();

    $order = Order::sole();

    expect((float) $order->total)->toBe(0.0)
        ->and((float) $order->subtotal)->toBe(0.0)
        ->and((float) $order->discount)->toBe(0.0)
        ->and((float) $order->items()->sole()->unit_price)->toBe(0.0);
});

test('a posted status and order number are ignored', function () {
    $this->postJson('/api/v1/orders', enquiry([
        'status' => OrderStatus::Completed->value,
        'order_number' => 'ORD-1999-000001',
        'source' => 'referral',
    ]))->assertCreated();

    $order = Order::sole();

    expect($order->status)->toBe(OrderStatus::New)
        ->and($order->source)->toBe('website')
        ->and($order->order_number)->not->toBe('ORD-1999-000001');
});

test('a posted line name is ignored in favour of the service title', function () {
    // Otherwise a submission could claim to have ordered something other than
    // the service it references.
    $service = Service::factory()->create(['title' => 'Training Top']);

    $this->postJson('/api/v1/orders', enquiry([
        'items' => [[
            'service_id' => $service->id,
            'quantity' => 5,
            'name' => 'Free samples',
        ]],
    ]))->assertCreated();

    expect(Order::sole()->items()->sole()->name)->toBe('Training Top');
});

test('chosen options are stored on the line', function () {
    $service = Service::factory()->create();

    $this->postJson('/api/v1/orders', enquiry([
        'items' => [[
            'service_id' => $service->id,
            'quantity' => 12,
            'options' => ['Size' => 'XL', 'Colour' => 'Red'],
        ]],
    ]))->assertCreated();

    expect(Order::sole()->items()->sole()->options)
        ->toBe(['Size' => 'XL', 'Colour' => 'Red']);
});

test('an enquiry cannot reference an inactive service', function () {
    $service = Service::factory()->inactive()->create();

    $this->postJson('/api/v1/orders', enquiry([
        'items' => [['service_id' => $service->id, 'quantity' => 5]],
    ]))
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['items.0.service_id' => 'That product is no longer available.']);

    expect(Order::count())->toBe(0);
});

test('an enquiry cannot reference a deleted service', function () {
    $service = Service::factory()->create();
    $service->delete();

    $this->postJson('/api/v1/orders', enquiry([
        'items' => [['service_id' => $service->id, 'quantity' => 5]],
    ]))->assertUnprocessable()
        ->assertJsonValidationErrors(['items.0.service_id']);
});

test('the contact details and at least one line are required', function () {
    $this->postJson('/api/v1/orders', [])
        ->assertUnprocessable()
        ->assertJsonValidationErrors([
            'customer_name',
            'customer_email',
            'customer_phone',
            'items' => 'Tell us which product you are enquiring about.',
        ]);
});

test('the email must be an address', function () {
    $this->postJson('/api/v1/orders', enquiry(['customer_email' => 'not-an-address']))
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['customer_email']);
});

test('the quantity must be a positive integer', function (mixed $quantity) {
    $this->postJson('/api/v1/orders', enquiry([
        'items' => [['service_id' => Service::factory()->create()->id, 'quantity' => $quantity]],
    ]))->assertUnprocessable()->assertJsonValidationErrors(['items.0.quantity']);
})->with([
    'zero' => 0,
    'negative' => -5,
    'fractional' => 2.5,
    'text' => 'many',
]);

test('order numbers do not collide across submissions', function () {
    $service = Service::factory()->create();

    foreach (range(1, 3) as $ignored) {
        $this->postJson('/api/v1/orders', enquiry([
            'items' => [['service_id' => $service->id, 'quantity' => 1]],
        ]))->assertCreated();
    }

    expect(Order::pluck('order_number')->unique())->toHaveCount(3);
});

test('the admin group is notified of a new enquiry', function () {
    Notification::fake();

    $admin = User::factory()->create(['role' => UserRole::Admin]);
    $editor = User::factory()->create(['role' => UserRole::Editor]);

    $this->postJson('/api/v1/orders', enquiry())->assertCreated();

    Notification::assertSentTo($admin, NewOrderSubmitted::class);
    Notification::assertNotSentTo($editor, NewOrderSubmitted::class);
});

test('the notification names the enquiry and its lines', function () {
    Notification::fake();

    $admin = User::factory()->create(['role' => UserRole::Admin]);
    $service = Service::factory()->create(['title' => 'Custom Jersey']);

    $this->postJson('/api/v1/orders', enquiry([
        'customer_note' => 'Crest on the chest.',
        'items' => [['service_id' => $service->id, 'quantity' => 25]],
    ]))->assertCreated();

    Notification::assertSentTo($admin, NewOrderSubmitted::class, function (
        NewOrderSubmitted $notification,
    ) use ($admin) {
        $mail = $notification->toMail($admin);
        $body = implode(' ', array_merge($mail->introLines, $mail->outroLines));

        expect($mail->subject)->toContain(Order::sole()->order_number)
            ->and($body)->toContain('25 × Custom Jersey')
            ->and($body)->toContain('Crest on the chest.');

        return true;
    });
});

test('a mail failure does not lose the enquiry', function () {
    // Inline send, so a broken mailer happens inside the customer's request.
    // They must still be told it worked, because it did.
    Notification::shouldReceive('send')->andThrow(new RuntimeException('SMTP down'));

    User::factory()->create(['role' => UserRole::Admin]);

    $this->postJson('/api/v1/orders', enquiry())->assertCreated();

    expect(Order::count())->toBe(1);
});

test('an enquiry is accepted when there are no admins to notify', function () {
    Notification::fake();

    $this->postJson('/api/v1/orders', enquiry())->assertCreated();

    Notification::assertNothingSent();
    expect(Order::count())->toBe(1);
});

test('submissions are rate limited', function () {
    $service = Service::factory()->create();

    // The route allows five a minute; the sixth is the one under test.
    foreach (range(1, 5) as $ignored) {
        $this->postJson('/api/v1/orders', enquiry([
            'items' => [['service_id' => $service->id, 'quantity' => 1]],
        ]))->assertCreated();
    }

    $this->postJson('/api/v1/orders', enquiry([
        'items' => [['service_id' => $service->id, 'quantity' => 1]],
    ]))->assertStatus(429);

    expect(Order::count())->toBe(5);
});
