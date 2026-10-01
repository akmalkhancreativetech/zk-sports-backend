<?php

namespace App\Http\Requests\Admin;

use App\Enums\PostStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class BlogPostRequest extends FormRequest
{
    /**
     * The model lowercases the slug on save, so validate the normalised value —
     * otherwise "Match Report" passes `unique` then collides with an existing
     * `match-report` at the index.
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
            'category_id' => ['nullable', 'integer', Rule::exists('blog_categories', 'id')],
            'title' => ['required', 'string', 'max:255'],
            'slug' => [
                'required',
                'string',
                'max:255',
                // Soft-deleted rows still occupy the unique index, so they count.
                Rule::unique('blog_posts', 'slug')->ignore($this->route('blogPost')),
            ],
            'excerpt' => ['nullable', 'string', 'max:300'],
            'body' => ['nullable', 'string', 'max:200000'],

            'featured_image' => ['nullable', 'image', 'mimes:jpeg,jpg,png,webp,avif', 'max:12288'],
            // Required whenever an image is present, new upload or already set.
            'featured_image_alt' => [
                'nullable',
                'string',
                'max:255',
                Rule::requiredIf(fn () => $this->hasFile('featured_image')
                    || (bool) $this->route('blogPost')?->featured_image),
            ],
            'og_image' => ['nullable', 'image', 'mimes:jpeg,jpg,png,webp,avif', 'max:12288'],

            'status' => ['required', Rule::enum(PostStatus::class)],
            // Blank while drafting; the controller stamps "now" on first publish.
            'published_at' => ['nullable', 'date'],
            'tags' => ['array'],
            'tags.*' => ['integer', Rule::exists('blog_tags', 'id')],

            'is_featured' => ['boolean'],

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
            'featured_image_alt.required' => 'Describe the image for screen readers.',
        ];
    }
}
