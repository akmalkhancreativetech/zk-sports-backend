<?php

namespace App\Enums;

enum ServiceOptionType: string
{
    /** Buyer picks from defined values, e.g. Size: S/M/L/XL. */
    case Select = 'select';

    /** Buyer types a value, e.g. "Name on back". */
    case Text = 'text';

    public function label(): string
    {
        return match ($this) {
            self::Select => 'Choose from a list',
            self::Text => 'Free text',
        };
    }

    public function needsValues(): bool
    {
        return $this === self::Select;
    }
}
