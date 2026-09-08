<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class ServiceCategoryRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        $slug = $this->input('slug') ?: $this->input('name');

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
            'name' => ['required', 'string', 'max:255'],
            'slug' => [
                'required',
                'string',
                'max:255',
                Rule::unique('service_categories', 'slug')
                    ->ignore($this->route('service_category')),
            ],
            'description' => ['nullable', 'string', 'max:2000'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['boolean'],
        ];
    }
}
