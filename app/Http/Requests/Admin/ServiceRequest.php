<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class ServiceRequest extends FormRequest
{
    /**
     * The model lowercases the slug on save, so validate the normalised value —
     * otherwise "Cricket Kits" passes `unique` then collides with an existing
     * `cricket-kits` at the index.
     */
    protected function prepareForValidation(): void
    {
        $slug = $this->input('slug') ?: $this->input('title');

        if ($slug) {
            $this->merge(['slug' => Str::lower(Str::slug((string) $slug))]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'category_id' => ['nullable', 'integer', Rule::exists('service_categories', 'id')],
            'title' => ['required', 'string', 'max:255'],
            'slug' => [
                'required',
                'string',
                'max:255',
                // Soft-deleted rows still occupy the unique index, so they count.
                Rule::unique('services', 'slug')->ignore($this->route('service')),
            ],
            'excerpt' => ['nullable', 'string', 'max:300'],
            'description' => ['nullable', 'string', 'max:20000'],
            'icon' => ['nullable', 'string', 'max:60'],

            'featured_image' => ['nullable', 'image', 'mimes:jpeg,jpg,png,webp,avif', 'max:12288'],
            'og_image' => ['nullable', 'image', 'mimes:jpeg,jpg,png,webp,avif', 'max:12288'],

            'price_from' => ['nullable', 'numeric', 'min:0', 'max:99999999.99'],
            'price_unit' => ['nullable', 'string', 'max:60', 'required_with:price_from'],
            'min_order_quantity' => ['nullable', 'integer', 'min:1', 'max:1000000'],

            'is_featured' => ['boolean'],
            'is_active' => ['boolean'],

            'meta_title' => ['nullable', 'string', 'max:255'],
            'meta_description' => ['nullable', 'string', 'max:320'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'price_unit.required_with' => 'Say what the price is per, e.g. "per kit".',
        ];
    }
}
