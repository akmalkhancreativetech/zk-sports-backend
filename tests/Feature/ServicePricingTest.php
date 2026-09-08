<?php

use App\Enums\ServiceOptionType;
use App\Models\Service;
use App\Models\User;

beforeEach(function () {
    $this->editor = User::factory()->create();
    $this->service = Service::factory()->create();
});

function tiersUrl(Service $service): string
{
    return "/admin/services/{$service->id}/price-tiers";
}

function optionsUrl(Service $service): string
{
    return "/admin/services/{$service->id}/options";
}

test('guests cannot edit pricing or options', function (string $path) {
    $this->put($path, [])->assertRedirect('/login');
})->with(fn () => [
    'tiers' => ['/admin/services/1/price-tiers'],
    'options' => ['/admin/services/1/options'],
]);

test('price tiers are saved in quantity order', function () {
    $this->actingAs($this->editor)
        ->put(tiersUrl($this->service), [
            'tiers' => [
                ['min_qty' => 51, 'max_qty' => null, 'unit_price' => '2000.00'],
                ['min_qty' => 1, 'max_qty' => 10, 'unit_price' => '3000.00'],
                ['min_qty' => 11, 'max_qty' => 50, 'unit_price' => '2500.00'],
            ],
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    expect($this->service->priceTiers()->pluck('min_qty')->all())->toBe([1, 11, 51]);
});

test('overlapping tiers are refused', function () {
    $this->actingAs($this->editor)
        ->put(tiersUrl($this->service), [
            'tiers' => [
                ['min_qty' => 1, 'max_qty' => 20, 'unit_price' => '3000.00'],
                ['min_qty' => 10, 'max_qty' => 50, 'unit_price' => '2500.00'],
            ],
        ])
        ->assertSessionHasErrors('tiers.0.max_qty');

    expect($this->service->priceTiers()->count())->toBe(0);
});

test('only the highest tier may be open ended', function () {
    $this->actingAs($this->editor)
        ->put(tiersUrl($this->service), [
            'tiers' => [
                ['min_qty' => 1, 'max_qty' => null, 'unit_price' => '3000.00'],
                ['min_qty' => 11, 'max_qty' => 50, 'unit_price' => '2500.00'],
            ],
        ])
        ->assertSessionHasErrors('tiers.0.max_qty');
});

test('a maximum below the minimum is refused', function () {
    $this->actingAs($this->editor)
        ->put(tiersUrl($this->service), [
            'tiers' => [['min_qty' => 20, 'max_qty' => 5, 'unit_price' => '3000.00']],
        ])
        ->assertSessionHasErrors('tiers.0.max_qty');
});

test('a rejected tier edit leaves the previous set intact', function () {
    $this->actingAs($this->editor)->put(tiersUrl($this->service), [
        'tiers' => [['min_qty' => 1, 'max_qty' => 10, 'unit_price' => '3000.00']],
    ]);

    $this->actingAs($this->editor)->put(tiersUrl($this->service), [
        'tiers' => [
            ['min_qty' => 1, 'max_qty' => 20, 'unit_price' => '1000.00'],
            ['min_qty' => 5, 'max_qty' => 50, 'unit_price' => '900.00'],
        ],
    ])->assertSessionHasErrors();

    expect($this->service->priceTiers()->count())->toBe(1);
    expect($this->service->priceTiers()->first()->unit_price)->toBe('3000.00');
});

test('tiers can be cleared by sending an empty set', function () {
    $this->actingAs($this->editor)->put(tiersUrl($this->service), [
        'tiers' => [['min_qty' => 1, 'max_qty' => null, 'unit_price' => '3000.00']],
    ]);

    $this->actingAs($this->editor)
        ->put(tiersUrl($this->service), ['tiers' => []])
        ->assertSessionHasNoErrors();

    expect($this->service->priceTiers()->count())->toBe(0);
});

test('the unit price resolves from the matching tier', function (int $quantity, ?string $expected) {
    $service = Service::factory()->create(['price_from' => '3500.00', 'price_unit' => 'per kit']);
    $service->priceTiers()->createMany([
        ['min_qty' => 10, 'max_qty' => 49, 'unit_price' => '3000.00'],
        ['min_qty' => 50, 'max_qty' => null, 'unit_price' => '2500.00'],
    ]);

    expect($service->load('priceTiers')->unitPriceFor($quantity))->toBe($expected);
})->with([
    'below the first tier falls back to price_from' => [5, '3500.00'],
    'inside the first tier' => [10, '3000.00'],
    'top of the first tier' => [49, '3000.00'],
    'into the open-ended tier' => [50, '2500.00'],
    'far into the open-ended tier' => [5000, '2500.00'],
]);

test('options are saved with their values in order', function () {
    $this->actingAs($this->editor)
        ->put(optionsUrl($this->service), [
            'options' => [
                [
                    'name' => 'Size',
                    'type' => 'select',
                    'is_required' => true,
                    'values' => [
                        ['label' => 'S', 'price_delta' => null],
                        ['label' => 'XL', 'price_delta' => '250.00'],
                    ],
                ],
                ['name' => 'Name on back', 'type' => 'text', 'is_required' => false, 'values' => []],
            ],
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    $options = $this->service->options()->with('values')->get();

    expect($options)->toHaveCount(2);
    expect($options[0]->name)->toBe('Size');
    expect($options[0]->type)->toBe(ServiceOptionType::Select);
    expect($options[0]->is_required)->toBeTrue();
    expect($options[0]->values->pluck('label')->all())->toBe(['S', 'XL']);
    expect($options[0]->values[1]->price_delta)->toBe('250.00');
    expect($options[1]->type)->toBe(ServiceOptionType::Text);
    expect($options[1]->values)->toHaveCount(0);
});

test('duplicate option names are refused regardless of case', function () {
    $this->actingAs($this->editor)
        ->put(optionsUrl($this->service), [
            'options' => [
                ['name' => 'Size', 'type' => 'text', 'values' => []],
                ['name' => 'size', 'type' => 'text', 'values' => []],
            ],
        ])
        ->assertSessionHasErrors('options');

    expect($this->service->options()->count())->toBe(0);
});

test('a select option needs at least one choice', function () {
    $this->actingAs($this->editor)
        ->put(optionsUrl($this->service), [
            'options' => [['name' => 'Size', 'type' => 'select', 'values' => []]],
        ])
        ->assertSessionHasErrors('options.0.values');
});

test('a free-text option keeps no values even if some are sent', function () {
    $this->actingAs($this->editor)
        ->put(optionsUrl($this->service), [
            'options' => [
                [
                    'name' => 'Name on back',
                    'type' => 'text',
                    'values' => [['label' => 'ignored', 'price_delta' => null]],
                ],
            ],
        ])
        ->assertSessionHasNoErrors();

    expect($this->service->options()->first()->values)->toHaveCount(0);
});

test('deleting a service cascades its options and tiers', function () {
    $this->service->priceTiers()->create([
        'min_qty' => 1, 'max_qty' => null, 'unit_price' => '100.00',
    ]);
    $option = $this->service->options()->create(['name' => 'Size', 'type' => 'select']);
    $option->values()->create(['label' => 'S']);

    // Soft delete keeps them; a force delete removes them via the FK cascade.
    $this->service->forceDelete();

    expect(DB::table('service_price_tiers')->count())->toBe(0);
    expect(DB::table('service_options')->count())->toBe(0);
    expect(DB::table('service_option_values')->count())->toBe(0);
});

test('the minimum order quantity is validated', function () {
    $this->actingAs($this->editor)
        ->put("/admin/services/{$this->service->id}", [
            'title' => 'Kits',
            'slug' => 'kits',
            'min_order_quantity' => 0,
        ])
        ->assertSessionHasErrors('min_order_quantity');
});
