<?php

namespace App\Enums;

/**
 * Only two stored states. "Scheduled" is not one of them: it is Published with
 * a `published_at` still in the future, derived rather than stored, so a post
 * cannot drift out of sync with its own date.
 */
enum PostStatus: string
{
    case Draft = 'draft';

    case Published = 'published';

    public function label(): string
    {
        return match ($this) {
            self::Draft => 'Draft',
            self::Published => 'Published',
        };
    }
}
