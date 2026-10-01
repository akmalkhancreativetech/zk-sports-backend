<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\OrderStatus;
use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\OrderRequest;
use App\Models\Order;
use App\Models\Service;
use App\Models\User;
use App\Notifications\NewOrderSubmitted;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;
use Throwable;

/**
 * Public quotation intake — the one write on an otherwise read-only API.
 *
 * The enquiry the public site sends is priced at zero throughout. Staff price
 * it during `reviewing` → `quoted`; `price_from` on a service is marketing copy
 * for a card, not a quotable figure.
 */
class OrderController extends Controller
{
    public function store(OrderRequest $request): JsonResponse
    {
        $validated = $request->validated();

        /*
         * Fetched in one query and keyed by id, so the loop below does not
         * issue a select per line. The `active` scope is applied again here
         * even though validation checked it: the two run at different moments,
         * and this is the one whose result is actually written.
         */
        $services = Service::query()
            ->active()
            ->findMany(array_column($validated['items'], 'service_id'))
            ->keyBy('id');

        $order = DB::transaction(function () use ($validated, $services) {
            $order = Order::create([
                // `nextOrderNumber` takes a locking read, so it must run inside
                // this transaction for the lock to mean anything.
                'order_number' => Order::nextOrderNumber(),
                'customer_name' => $validated['customer_name'],
                'customer_email' => $validated['customer_email'],
                'customer_phone' => $validated['customer_phone'],
                'company' => $validated['company'] ?? null,
                'customer_note' => $validated['customer_note'] ?? null,
                'status' => OrderStatus::New,
                'source' => 'website',
            ]);

            foreach ($validated['items'] as $item) {
                $service = $services[$item['service_id']];

                $order->items()->create([
                    'service_id' => $service->id,
                    // Snapshotted, never posted: a later rename or deletion must
                    // not rewrite what this customer asked for.
                    'name' => $service->title,
                    'quantity' => $item['quantity'],
                    // An enquiry carries no prices. `line_total` is derived from
                    // these by OrderItem::saving.
                    'unit_price' => 0,
                    'options' => $item['options'] ?? null,
                ]);
            }

            return $order;
        });

        $this->notifyAdmins($order);

        /*
         * Only the reference comes back. The order carries `internal_note` and
         * `assigned_to`, and echoing the record would publish both — along with
         * a confirmation that a given email address is in the system.
         */
        return response()->json(
            ['data' => ['order_number' => $order->order_number]],
            201,
        );
    }

    /**
     * Mail the admin group, inline rather than queued.
     *
     * Deliberately swallowing the failure: the enquiry is already committed, so
     * a mail outage must not turn a successful submission into an error the
     * visitor sees — they would assume it had not sent and file it again. The
     * order is still in the admin list either way; the log is how anyone learns
     * the mail did not go out.
     *
     * Sent outside the transaction above so a send can never hold a write lock
     * open for the length of an SMTP round trip.
     */
    private function notifyAdmins(Order $order): void
    {
        try {
            $admins = User::query()->where('role', UserRole::Admin)->get();

            if ($admins->isNotEmpty()) {
                Notification::send($admins, new NewOrderSubmitted($order));
            }
        } catch (Throwable $exception) {
            Log::error('Failed to notify admins of a new enquiry.', [
                'order_number' => $order->order_number,
                'exception' => $exception,
            ]);
        }
    }
}
