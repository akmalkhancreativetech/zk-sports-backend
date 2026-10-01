<?php

namespace App\Notifications;

use App\Models\Order;
use App\Models\OrderItem;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Tells the admin group that a quotation enquiry has arrived.
 *
 * Not queued, by decision: mail goes out inline with the customer's request.
 * The caller therefore has to treat a mail failure as non-fatal — the enquiry
 * is already saved, and a send that fails must not tell the visitor their
 * submission did not work. See Api\V1\OrderController::store.
 */
class NewOrderSubmitted extends Notification
{
    public function __construct(public Order $order) {}

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $order = $this->order->loadMissing('items');

        $message = (new MailMessage)
            ->subject("New enquiry {$this->order->order_number} — {$this->order->customer_name}")
            ->greeting("Enquiry {$this->order->order_number}")
            ->line("{$this->order->customer_name} has requested a quote.");

        if ($this->order->company) {
            $message->line("Company: {$this->order->company}");
        }

        $message
            ->line("Email: {$this->order->customer_email}")
            ->line("Phone: {$this->order->customer_phone}");

        /*
         * Listed rather than summarised: whoever picks this up needs the
         * quantities to price it, and opening the panel to read two lines is
         * friction on the one action this mail exists to prompt.
         */
        foreach ($order->items as $item) {
            /** @var OrderItem $item */
            $message->line("· {$item->quantity} × {$item->name}");
        }

        if ($this->order->customer_note) {
            $message->line('Note: '.$this->order->customer_note);
        }

        return $message
            ->action('Open in the admin panel', route('admin.orders.show', $this->order))
            ->line('Nothing is priced yet — the enquiry is waiting for triage.');
    }
}
