<?php

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * A quotation enquiry submitted from the public site (plan.md §7).
 *
 * What is absent matters more than what is here. There is no `unit_price`, no
 * `total`, no `status`, no `source` and no `order_number`: a website submission
 * is an enquiry, not a priced order, and every one of those is set server side.
 * Accepting a posted price would let a visitor name their own.
 *
 * `items.*.name` is absent for the same reason — the line's name is snapshotted
 * from the service, so a submission cannot claim to have ordered something
 * other than what it references.
 */
class OrderRequest extends FormRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'customer_name' => ['required', 'string', 'max:255'],
            'customer_email' => ['required', 'string', 'email', 'max:255'],
            'customer_phone' => ['required', 'string', 'max:255'],
            'company' => ['nullable', 'string', 'max:255'],
            'customer_note' => ['nullable', 'string', 'max:5000'],

            'items' => ['required', 'array', 'min:1', 'max:50'],

            /*
             * Active only, and not soft-deleted: an enquiry may not reference a
             * service that is not for sale. `Rule::exists` bypasses the model's
             * scopes, so both conditions are spelled out here.
             */
            'items.*.service_id' => [
                'required',
                'integer',
                Rule::exists('services', 'id')
                    ->where('is_active', true)
                    ->whereNull('deleted_at'),
            ],
            'items.*.quantity' => ['required', 'integer', 'min:1', 'max:1000000'],

            // Free-form {option name: chosen value}, stored as JSON on the line.
            'items.*.options' => ['nullable', 'array'],
            'items.*.options.*' => ['nullable', 'string', 'max:255'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'items.required' => 'Tell us which product you are enquiring about.',
            'items.*.service_id.exists' => 'That product is no longer available.',
            'items.*.quantity.min' => 'Quantity must be at least 1.',
        ];
    }
}
