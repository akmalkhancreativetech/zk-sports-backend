<?php

namespace App\Policies;

use App\Models\Slider;
use App\Models\User;

/**
 * Editors get full CRUD on content modules; only admins delete (plan.md §3.1).
 */
class SliderPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('access-admin');
    }

    public function view(User $user, Slider $slider): bool
    {
        return $user->can('access-admin');
    }

    public function create(User $user): bool
    {
        return $user->can('access-admin');
    }

    public function update(User $user, Slider $slider): bool
    {
        return $user->can('access-admin');
    }

    public function delete(User $user, Slider $slider): bool
    {
        return $user->isAdmin();
    }
}
