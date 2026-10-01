<?php

namespace App\Policies;

use App\Models\BlogPost;
use App\Models\User;

/**
 * Editors get full CRUD on content; deletion stays with admins, matching
 * ServicePolicy.
 */
class BlogPostPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('access-admin');
    }

    public function view(User $user, BlogPost $post): bool
    {
        return $user->can('access-admin');
    }

    public function create(User $user): bool
    {
        return $user->can('access-admin');
    }

    public function update(User $user, BlogPost $post): bool
    {
        return $user->can('access-admin');
    }

    public function delete(User $user, BlogPost $post): bool
    {
        return $user->isAdmin();
    }

    public function restore(User $user, BlogPost $post): bool
    {
        return $user->isAdmin();
    }

    public function forceDelete(User $user, BlogPost $post): bool
    {
        return $user->isAdmin();
    }
}
