<?php

namespace App\Http\Controllers\Admin;

use App\Enums\ServiceOptionType;
use App\Http\Controllers\Controller;
use App\Models\Service;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rules\Enum;
use Illuminate\Validation\ValidationException;

/**
 * Options and price tiers are saved as whole sets rather than row by row.
 *
 * Both carry cross-row rules — duplicate option names, overlapping tier ranges —
 * that can only be checked with the full set in hand, and replacing atomically
 * means a rejected edit leaves the previous set untouched.
 */
class ServiceOptionController extends Controller
{
    public function updateOptions(Request $request, Service $service): RedirectResponse
    {
        Gate::authorize('update', $service);

        $validated = $request->validate([
            'options' => ['present', 'array', 'max:20'],
            'options.*.name' => ['required', 'string', 'max:60'],
            'options.*.type' => ['required', new Enum(ServiceOptionType::class)],
            'options.*.is_required' => ['boolean'],
            'options.*.values' => ['array', 'max:50'],
            'options.*.values.*.label' => ['required', 'string', 'max:60'],
            'options.*.values.*.price_delta' => ['nullable', 'numeric', 'between:-999999.99,999999.99'],
        ]);

        $options = $validated['options'];

        $this->assertUniqueNames($options);
        $this->assertSelectsHaveValues($options);

        DB::transaction(function () use ($service, $options) {
            // Nothing references these ids — order_items snapshot their own
            // options as JSON — so replacing outright is safe.
            $service->options()->delete();

            foreach (array_values($options) as $index => $option) {
                $created = $service->options()->create([
                    'name' => $option['name'],
                    'type' => $option['type'],
                    'is_required' => $option['is_required'] ?? false,
                    'sort_order' => $index,
                ]);

                if ($option['type'] !== ServiceOptionType::Select->value) {
                    continue;
                }

                foreach (array_values($option['values'] ?? []) as $position => $value) {
                    $created->values()->create([
                        'label' => $value['label'],
                        'price_delta' => $value['price_delta'] ?? null,
                        'sort_order' => $position,
                    ]);
                }
            }
        });

        return back()->with('success', 'Options saved.');
    }

    public function updateTiers(Request $request, Service $service): RedirectResponse
    {
        Gate::authorize('update', $service);

        $validated = $request->validate([
            'tiers' => ['present', 'array', 'max:20'],
            'tiers.*.min_qty' => ['required', 'integer', 'min:1'],
            'tiers.*.max_qty' => ['nullable', 'integer', 'min:1'],
            'tiers.*.unit_price' => ['required', 'numeric', 'min:0', 'max:99999999.99'],
        ]);

        $tiers = $this->sortedTiers($validated['tiers']);

        $this->assertTiersDoNotOverlap($tiers);

        DB::transaction(function () use ($service, $tiers) {
            $service->priceTiers()->delete();

            foreach ($tiers as $tier) {
                $service->priceTiers()->create([
                    'min_qty' => $tier['min_qty'],
                    'max_qty' => $tier['max_qty'] ?? null,
                    'unit_price' => $tier['unit_price'],
                ]);
            }
        });

        return back()->with('success', 'Price tiers saved.');
    }

    /**
     * @param  array<int, array<string, mixed>>  $tiers
     * @return array<int, array<string, mixed>>
     */
    private function sortedTiers(array $tiers): array
    {
        usort($tiers, fn (array $a, array $b) => $a['min_qty'] <=> $b['min_qty']);

        return $tiers;
    }

    /**
     * @param  array<int, array<string, mixed>>  $options
     */
    private function assertUniqueNames(array $options): void
    {
        $names = array_map(
            fn (array $option) => mb_strtolower(trim((string) $option['name'])),
            $options,
        );

        if (count($names) !== count(array_unique($names))) {
            throw ValidationException::withMessages([
                'options' => 'Each option needs a distinct name.',
            ]);
        }
    }

    /**
     * @param  array<int, array<string, mixed>>  $options
     */
    private function assertSelectsHaveValues(array $options): void
    {
        foreach (array_values($options) as $index => $option) {
            if ($option['type'] !== ServiceOptionType::Select->value) {
                continue;
            }

            if (count($option['values'] ?? []) < 1) {
                throw ValidationException::withMessages([
                    "options.{$index}.values" => 'Add at least one choice, or use free text.',
                ]);
            }
        }
    }

    /**
     * Ranges must not overlap, and only the highest tier may be open-ended —
     * otherwise a quantity could resolve to two different prices.
     *
     * @param  array<int, array<string, mixed>>  $tiers
     */
    private function assertTiersDoNotOverlap(array $tiers): void
    {
        $last = count($tiers) - 1;

        foreach ($tiers as $index => $tier) {
            $max = $tier['max_qty'] ?? null;

            if ($max !== null && $max < $tier['min_qty']) {
                throw ValidationException::withMessages([
                    "tiers.{$index}.max_qty" => 'The maximum must not be below the minimum.',
                ]);
            }

            if ($max === null && $index !== $last) {
                throw ValidationException::withMessages([
                    "tiers.{$index}.max_qty" => 'Only the highest tier can be left open-ended.',
                ]);
            }

            if ($index < $last && $max !== null && $tiers[$index + 1]['min_qty'] <= $max) {
                throw ValidationException::withMessages([
                    "tiers.{$index}.max_qty" => 'Tier ranges must not overlap.',
                ]);
            }
        }
    }
}
