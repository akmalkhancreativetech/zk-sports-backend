"use client";

import Link from "next/link";
import { useActionState } from "react";

import { submitQuote, type QuoteState } from "@/app/quote/actions";
import type { Service } from "@/lib/schemas";
import { SITE } from "@/lib/site";

/**
 * The quote enquiry form.
 *
 * A client component only so it can place the API's validation messages against
 * the right inputs — the submission itself is a server action, so the form
 * still works with JavaScript disabled, just without inline errors.
 *
 * Field names match the API payload, and error keys come back as the API's own
 * paths (`items.0.quantity`), so nothing has to be translated between the two.
 */

const INITIAL: QuoteState = { status: "idle" };

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) {
    return null;
  }

  return <p className="mt-1.5 text-sm text-accent">{errors[0]}</p>;
}

const inputClass =
  "w-full border border-border bg-background px-4 py-2.5 text-sm placeholder:text-muted";

export function QuoteForm({
  products,
  defaultProductId,
}: {
  products: readonly Service[];
  defaultProductId?: number;
}) {
  const [state, formAction, pending] = useActionState(submitQuote, INITIAL);

  if (state.status === "success") {
    return (
      <div className="border-t-2 border-foreground pt-6">
        <h2 className="font-display text-3xl font-bold uppercase tracking-tight">
          Enquiry received
        </h2>

        <p className="mt-3 text-muted">
          Your reference is{" "}
          <strong className="font-semibold tabular-nums text-foreground">
            {state.orderNumber}
          </strong>
          . We will reply with a costed quote — usually within one working day.
        </p>

        <Link
          href="/products"
          className="mt-6 inline-block bg-accent-solid px-6 py-3 text-sm font-semibold text-accent-foreground hover:opacity-90"
        >
          Back to products
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="max-w-2xl">
      {state.message && (
        <p
          // `aria-live` so a screen reader hears the failure; the message
          // arrives after submission, not on first render.
          aria-live="polite"
          className="mb-6 border border-accent px-4 py-3 text-sm text-accent"
        >
          {state.message}
        </p>
      )}

      <fieldset disabled={pending} className="space-y-6">
        <legend className="sr-only">Your enquiry</legend>

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="service_id" className="block text-sm font-semibold">
              Product
            </label>
            <select
              id="service_id"
              name="service_id"
              defaultValue={defaultProductId ?? ""}
              required
              className={inputClass}
            >
              <option value="" disabled>
                Choose a product
              </option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.title}
                </option>
              ))}
            </select>
            <FieldError errors={state.errors?.["items.0.service_id"]} />
          </div>

          <div>
            <label htmlFor="quantity" className="block text-sm font-semibold">
              Quantity
            </label>
            <input
              id="quantity"
              name="quantity"
              type="number"
              min={1}
              defaultValue={10}
              required
              className={inputClass}
            />
            <FieldError errors={state.errors?.["items.0.quantity"]} />
          </div>

          <div>
            <label htmlFor="company" className="block text-sm font-semibold">
              Club or company <span className="font-normal text-muted">optional</span>
            </label>
            <input id="company" name="company" type="text" className={inputClass} />
            <FieldError errors={state.errors?.company} />
          </div>

          <div>
            <label htmlFor="customer_name" className="block text-sm font-semibold">
              Your name
            </label>
            <input
              id="customer_name"
              name="customer_name"
              type="text"
              autoComplete="name"
              required
              className={inputClass}
            />
            <FieldError errors={state.errors?.customer_name} />
          </div>

          <div>
            <label htmlFor="customer_email" className="block text-sm font-semibold">
              Email
            </label>
            <input
              id="customer_email"
              name="customer_email"
              type="email"
              autoComplete="email"
              required
              className={inputClass}
            />
            <FieldError errors={state.errors?.customer_email} />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="customer_phone" className="block text-sm font-semibold">
              Phone
            </label>
            <input
              id="customer_phone"
              name="customer_phone"
              type="tel"
              autoComplete="tel"
              required
              className={inputClass}
            />
            <FieldError errors={state.errors?.customer_phone} />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="customer_note" className="block text-sm font-semibold">
              Details{" "}
              <span className="font-normal text-muted">
                sizes, colours, artwork, deadline
              </span>
            </label>
            <textarea
              id="customer_note"
              name="customer_note"
              rows={5}
              className={inputClass}
            />
            <FieldError errors={state.errors?.customer_note} />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <button
            type="submit"
            className="bg-accent-solid px-7 py-3.5 text-sm font-semibold text-accent-foreground hover:opacity-90 disabled:opacity-60"
          >
            {pending ? "Sending…" : "Send enquiry"}
          </button>

          <p className="text-sm text-muted">
            Or email{" "}
            <a href={`mailto:${SITE.email}`} className="text-accent hover:underline">
              {SITE.email}
            </a>
          </p>
        </div>
      </fieldset>
    </form>
  );
}
