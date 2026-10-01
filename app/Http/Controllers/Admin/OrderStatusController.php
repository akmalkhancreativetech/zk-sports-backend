<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\OrderStatusRequest;
use App\Models\Order;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Gate;

/**
 * The only way an order's status moves. Separate from OrderController because
 * it carries a different permission and writes an audit row.
 */
class OrderStatusController extends Controller
{
    public function store(OrderStatusRequest $request, Order $order): RedirectResponse
    {
        Gate::authorize('changeStatus', $order);

        $target = $request->status();

        // The graph, not the payload, decides. A stale tab offering a move that
        // is no longer legal gets told so rather than silently corrupting the
        // timeline.
        $moved = $order->transitionTo(
            $target,
            $request->user(),
            $request->validated('note'),
        );

        if (! $moved) {
            return back()->withErrors([
                'status' => sprintf(
                    'An order that is %s cannot move to %s.',
                    $order->status->label(),
                    $target->label(),
                ),
            ]);
        }

        return back()->with('success', "Order marked {$target->label()}.");
    }
}
