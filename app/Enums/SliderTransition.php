<?php

namespace App\Enums;

enum SliderTransition: string
{
    case Slide = 'slide';
    case Fade = 'fade';

    public function label(): string
    {
        return match ($this) {
            self::Slide => 'Slide',
            self::Fade => 'Fade',
        };
    }
}
