<?php

namespace App\Http\Controllers\Admin;

use App\Enums\OrderStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\OrderRequest;
use App\Models\Order;
use App\Models\OrderStatusHistory;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class OrderController extends Controller
{
    /** Columns the client is allowed to sort by. */
    private const SORTABLE = ['order_number', 'customer_name', 'status', 'total', 'created_at', 'updated_at'];

    /** Must appear in DataTable's `pageSizeOptions`. */
    private const PER_PAGE = 15;

    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', Order::class);

        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
            'status' => ['nullable', Rule::enum(OrderStatus::class)],
            'assignee' => ['nullable', 'integer', Rule::exists('users', 'id')],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
            'trashed' => ['nullable', Rule::in(['with', 'only'])],
            'sort' => ['nullable', 'string', Rule::in(self::SORTABLE)],
            'direction' => ['nullable', 'string', Rule::in(['asc', 'desc'])],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $sort = $filters['sort'] ?? 'created_at';
        $direction = $filters['direction'] ?? 'desc';

        $orders = $this->filtered($filters)
            ->with('assignee:id,name')
            ->withCount('items')
            ->orderBy($sort, $direction)
            ->orderBy('id')
            ->paginate($filters['per_page'] ?? self::PER_PAGE)
            ->withQueryString()
            ->through(fn (Order $order) => [
                'id' => $order->id,
                'order_number' => $order->order_number,
                'customer_name' => $order->customer_name,
                'customer_email' => $order->customer_email,
                'company' => $order->company,
                'status' => $order->status->value,
                'status_label' => $order->status->label(),
                'status_tone' => $order->status->tone(),
                'source' => $order->source,
                'assignee' => $order->assignee?->name,
                'items_count' => $order->items_count,
                'currency' => $order->currency,
                'total' => $order->total,
                'created_at' => $order->created_at?->toIso8601String(),
                'deleted_at' => $order->deleted_at?->toIso8601String(),
            ]);

        return Inertia::render('admin/orders/index', [
            'orders' => $orders,
            'filters' => [
                'search' => $filters['search'] ?? null,
                'status' => $filters['status'] ?? null,
                'assignee' => isset($filters['assignee']) ? (string) $filters['assignee'] : null,
                'from' => $filters['from'] ?? null,
                'to' => $filters['to'] ?? null,
                'trashed' => $filters['trashed'] ?? null,
                'sort' => $sort,
                'direction' => $direction,
            ],
            'statusCounts' => $this->statusCounts(),
            'statuses' => OrderStatus::options(),
            'assignees' => $this->assigneeOptions(),
            'canDelete' => $request->user()->can('delete', new Order),
        ]);
    }

    public function show(Request $request, Order $order): Response
    {
        Gate::authorize('view', $order);

        $order->load([
            'items' => fn ($query) => $query->orderBy('id'),
            'items.service:id,title',
            'assignee:id,name',
            'customer:id,name,email',
            'statusHistories' => fn ($query) => $query->latest('created_at')->latest('id'),
            'statusHistories.user:id,name',
        ]);

        return Inertia::render('admin/orders/show', [
            'order' => [
                'id' => $order->id,
                'order_number' => $order->order_number,
                'status' => $order->status->value,
                'status_label' => $order->status->label(),
                'status_tone' => $order->status->tone(),
                'is_terminal' => $order->status->isTerminal(),
                'source' => $order->source,
                'assigned_to' => $order->assigned_to ? (string) $order->assigned_to : null,
                'customer_name' => $order->customer_name,
                'customer_email' => $order->customer_email,
                'customer_phone' => $order->customer_phone,
                'company' => $order->company,
                'registered_customer' => $order->customer?->name,
                'currency' => $order->currency,
                'subtotal' => $order->subtotal,
                'discount' => $order->discount,
                'tax' => $order->tax,
                'total' => $order->total,
                'customer_note' => $order->customer_note,
                'internal_note' => $order->internal_note,
                'quoted_at' => $order->quoted_at?->toIso8601String(),
                'approved_at' => $order->approved_at?->toIso8601String(),
                'completed_at' => $order->completed_at?->toIso8601String(),
                'created_at' => $order->created_at?->toIso8601String(),
            ],
            'items' => $order->items->map(fn ($item) => [
                'id' => $item->id,
                'service_id' => $item->service_id ? (string) $item->service_id : null,
                'service_title' => $item->service?->title,
                'name' => $item->name,
                'description' => $item->description,
                'quantity' => $item->quantity,
                'unit_price' => $item->unit_price,
                'line_total' => $item->line_total,
                'options' => $item->options ?? [],
            ])->values(),
            'timeline' => $order->statusHistories->map(fn (OrderStatusHistory $entry) => [
                'id' => $entry->id,
                'from_label' => $entry->from_status?->label(),
                'to_label' => $entry->to_status->label(),
                'to_tone' => $entry->to_status->tone(),
                'user' => $entry->user?->name,
                'note' => $entry->note,
                'created_at' => $entry->created_at?->toIso8601String(),
            ])->values(),
            // Only the moves the graph actually permits reach the UI, so the
            // select cannot offer a transition the server would reject.
            'allowedTransitions' => array_map(
                fn (OrderStatus $status) => ['value' => $status->value, 'label' => $status->label()],
                $order->status->allowedTransitions(),
            ),
            'assignees' => $this->assigneeOptions(),
            'canDelete' => $request->user()->can('delete', $order),
        ]);
    }

    /**
     * Replaces the line items wholesale and re-derives the totals. A diff-based
     * update would need stable client ids for rows that may not exist yet; the
     * set is small enough that replacing it is both simpler and correct.
     */
    public function update(OrderRequest $request, Order $order): RedirectResponse
    {
        Gate::authorize('update', $order);

        $validated = $request->validated();

        DB::transaction(function () use ($order, $validated) {
            $order->update([
                'assigned_to' => $validated['assigned_to'] ?? null,
                'internal_note' => $validated['internal_note'] ?? null,
                'discount' => $validated['discount'] ?? 0,
                'tax' => $validated['tax'] ?? 0,
            ]);

            $order->items()->delete();

            foreach ($validated['items'] as $item) {
                $order->items()->create([
                    'service_id' => $item['service_id'] ?? null,
                    'name' => $item['name'],
                    'description' => $item['description'] ?? null,
                    'quantity' => $item['quantity'],
                    'unit_price' => $item['unit_price'],
                    'options' => $item['options'] ?? null,
                ]);
            }

            $order->recalculateTotals();
        });

        return back()->with('success', 'Order updated.');
    }

    public function destroy(Order $order): RedirectResponse
    {
        Gate::authorize('delete', $order);

        $order->delete();

        return to_route('admin.orders.index')->with('success', 'Order deleted.');
    }

    /**
     * Applies the list filters shared by the index and its counts.
     *
     * @param  array<string, mixed>  $filters
     * @return Builder<Order>
     */
    private function filtered(array $filters): Builder
    {
        return Order::query()
            ->when(
                $filters['trashed'] ?? null,
                fn ($query, string $value) => $value === 'only'
                    ? $query->onlyTrashed()
                    : $query->withTrashed(),
            )
            ->when(
                $filters['search'] ?? null,
                fn ($query, string $term) => $query->where(
                    fn ($q) => $q->where('order_number', 'like', "%{$term}%")
                        ->orWhere('customer_name', 'like', "%{$term}%")
                        ->orWhere('customer_email', 'like', "%{$term}%")
                        ->orWhere('company', 'like', "%{$term}%")
                ),
            )
            ->when(
                $filters['status'] ?? null,
                fn ($query, string $value) => $query->where('status', $value),
            )
            ->when(
                $filters['assignee'] ?? null,
                fn ($query, int $id) => $query->where('assigned_to', $id),
            )
            ->when(
                $filters['from'] ?? null,
                fn ($query, string $date) => $query->whereDate('created_at', '>=', $date),
            )
            ->when(
                $filters['to'] ?? null,
                fn ($query, string $date) => $query->whereDate('created_at', '<=', $date),
            );
    }

    /**
     * Counts for the status tabs, in one grouped query rather than one per tab.
     *
     * @return array<string, int>
     */
    private function statusCounts(): array
    {
        $counts = Order::query()
            ->selectRaw('status, count(*) as aggregate')
            ->groupBy('status')
            ->pluck('aggregate', 'status')
            ->all();

        $byStatus = [];

        foreach (OrderStatus::cases() as $case) {
            $byStatus[$case->value] = (int) ($counts[$case->value] ?? 0);
        }

        return ['all' => array_sum($byStatus), ...$byStatus];
    }

    /**
     * @return array<int, array{value: string, label: string}>
     */
    private function assigneeOptions(): array
    {
        return User::query()
            ->orderBy('name')
            ->get(['id', 'name'])
            ->map(fn (User $user) => [
                'value' => (string) $user->id,
                'label' => $user->name,
            ])
            ->all();
    }
}
