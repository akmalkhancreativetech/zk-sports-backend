<?php

namespace App\Http\Requests\Admin;

use App\Enums\SlideTextPosition;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Enum;

class SlideRequest extends FormRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        // A slide must have a desktop image; on update it may already have one.
        $imageRule = $this->route('slide') ? ['nullable'] : ['required'];

        return [
            'title' => ['nullable', 'string', 'max:255'],
            'subtitle' => ['nullable', 'string', 'max:255'],
            'body' => ['nullable', 'string', 'max:2000'],

            'image' => [...$imageRule, 'image', 'mimes:jpeg,jpg,png,webp,avif', 'max:12288'],
            'mobile_image' => ['nullable', 'image', 'mimes:jpeg,jpg,png,webp,avif', 'max:12288'],
            // Accessibility and SEO: an image without alt text is a defect.
            'image_alt' => ['required', 'string', 'max:255'],

            'cta_label' => ['nullable', 'string', 'max:100', 'required_with:cta_url'],
            'cta_url' => ['nullable', 'string', 'max:2048', 'required_with:cta_label'],
            'cta_new_tab' => ['boolean'],

            'text_position' => ['required', new Enum(SlideTextPosition::class)],
            'overlay_opacity' => ['required', 'integer', 'min:0', 'max:100'],

            'is_active' => ['boolean'],
            'starts_at' => ['nullable', 'date'],
            'ends_at' => ['nullable', 'date', 'after:starts_at'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'image_alt.required' => 'Alt text is required so the slide is accessible and indexable.',
            'ends_at.after' => 'The end date must fall after the start date.',
        ];
    }
}
