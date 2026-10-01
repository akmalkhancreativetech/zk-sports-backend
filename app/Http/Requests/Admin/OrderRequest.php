<?php

namespace App\Http\Requests\Admin;

use App\Http\Controllers\Admin\OrderStatusController;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Editing an existing order: line items, staff-entered money adjustments,
 * assignment and the internal note.
 *
 * Customer identity and `status` are deliberately absent. Identity comes from
 * the submission, and status moves only through
 * {@see OrderStatusController}, which enforces the
 * transition graph.
 */
class OrderRequest extends FormRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'assigned_to' => ['nullable', 'integer', Rule::exists('users', 'id')],
            'internal_note' => ['nullable', 'string', 'max:5000'],

            'discount' => ['nullable', 'numeric', 'min:0', 'max:99999999.99'],
            'tax' => ['nullable', 'numeric', 'min:0', 'max:99999999.99'],

            // The whole set is posted every time: totals are recalculated from
            // it, so a partial list would silently drop lines.
            'items' => ['present', 'array', 'max:100'],
            'items.*.service_id' => ['nullable', 'integer', Rule::exists('services', 'id')],
            'items.*.name' => ['required', 'string', 'max:255'],
            'items.*.description' => ['nullable', 'string', 'max:2000'],
            'items.*.quantity' => ['required', 'integer', 'min:1', 'max:1000000'],
            'items.*.unit_price' => ['required', 'numeric', 'min:0', 'max:99999999.99'],
            'items.*.options' => ['nullable', 'array'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'items.*.name.required' => 'Every line needs a description of what was ordered.',
            'items.*.quantity.min' => 'Quantity must be at least 1.',
        ];
    }
}
