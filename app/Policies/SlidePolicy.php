<?php

namespace App\Policies;

use App\Models\Slide;
use App\Models\User;

class SlidePolicy
{
    public function create(User $user): bool
    {
        return $user->can('access-admin');
    }

    public function update(User $user, Slide $slide): bool
    {
        return $user->can('access-admin');
    }

    /**
     * Slides are cheap, regenerable content rather than business records, so
     * editors may remove them — unlike whole sliders or orders.
     */
    public function delete(User $user, Slide $slide): bool
    {
        return $user->can('access-admin');
    }
}
