<?php

namespace App\Policies;

use App\Models\BlogCategory;
use App\Models\User;

/**
 * Editors get full CRUD on content; deletion stays with admins, matching
 * ServiceCategoryPolicy.
 */
class BlogCategoryPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('access-admin');
    }

    public function create(User $user): bool
    {
        return $user->can('access-admin');
    }

    public function update(User $user, BlogCategory $category): bool
    {
        return $user->can('access-admin');
    }

    public function delete(User $user, BlogCategory $category): bool
    {
        return $user->isAdmin();
    }

    public function restore(User $user, BlogCategory $category): bool
    {
        return $user->isAdmin();
    }

    public function forceDelete(User $user, BlogCategory $category): bool
    {
        return $user->isAdmin();
    }
}
