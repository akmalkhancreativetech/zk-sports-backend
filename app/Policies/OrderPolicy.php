<?php

namespace App\Policies;

use App\Models\Order;
use App\Models\User;

/**
 * plan.md §3.1: editors get read + status-change on orders; only admins delete.
 *
 * There is deliberately no `create` — orders arrive from the public site, never
 * from this panel, which is why routes.ts declares no create or edit URL.
 */
class OrderPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('access-admin');
    }

    public function view(User $user, Order $order): bool
    {
        return $user->can('access-admin');
    }

    /** Covers line items, notes and assignment. */
    public function update(User $user, Order $order): bool
    {
        return $user->can('access-admin');
    }

    /** Moving an order along the workflow — the editor's main job here. */
    public function changeStatus(User $user, Order $order): bool
    {
        return $user->can('access-admin');
    }

    public function delete(User $user, Order $order): bool
    {
        return $user->isAdmin();
    }

    public function restore(User $user, Order $order): bool
    {
        return $user->isAdmin();
    }

    public function forceDelete(User $user, Order $order): bool
    {
        return $user->isAdmin();
    }
}
