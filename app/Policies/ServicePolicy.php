<?php

namespace App\Policies;

use App\Models\Service;
use App\Models\User;

/**
 * Editors get full CRUD on content; deletion stays with admins, matching
 * SliderPolicy. Note this is stricter than plan.md §3.1, which would let
 * editors delete content too.
 */
class ServicePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('access-admin');
    }

    public function view(User $user, Service $service): bool
    {
        return $user->can('access-admin');
    }

    public function create(User $user): bool
    {
        return $user->can('access-admin');
    }

    public function update(User $user, Service $service): bool
    {
        return $user->can('access-admin');
    }

    public function delete(User $user, Service $service): bool
    {
        return $user->isAdmin();
    }

    public function restore(User $user, Service $service): bool
    {
        return $user->isAdmin();
    }

    public function forceDelete(User $user, Service $service): bool
    {
        return $user->isAdmin();
    }
}
