<?php

namespace App\Http\Requests\Admin;

use App\Enums\SliderTransition;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Enum;

class SliderRequest extends FormRequest
{
    /**
     * The model normalises `key` on save, so validate the normalised value —
     * otherwise "Home Hero" passes the unique rule and then collides with an
     * existing `home_hero` at the index.
     */
    protected function prepareForValidation(): void
    {
        if ($this->has('key')) {
            $this->merge([
                'key' => Str::lower(Str::slug((string) $this->input('key'), '_')),
            ]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'key' => [
                'required',
                'string',
                'max:255',
                Rule::unique('sliders', 'key')->ignore($this->route('slider')),
            ],
            'is_active' => ['boolean'],
            'autoplay' => ['boolean'],
            'interval_ms' => ['required', 'integer', 'min:1000', 'max:60000'],
            'transition' => ['required', new Enum(SliderTransition::class)],
        ];
    }
}
