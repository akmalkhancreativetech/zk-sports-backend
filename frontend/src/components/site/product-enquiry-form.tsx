"use client";

import Link from "next/link";
import { useActionState } from "react";

import { submitQuote, type QuoteState } from "@/app/quote/actions";
import type { Service } from "@/lib/schemas";
import { SITE } from "@/lib/site";

/**
 * The enquiry form on a product page.
 *
 * This is where a product's options become interactive: the page has already
 * loaded them, so each one renders as a real control and the chosen values ride
 * along to `order_items.options`. The generic form on /quote cannot do this —
 * it only knows a product id, not that product's options.
 *
 * Shares the `submitQuote` server action with /quote, so the form still submits
 * without JavaScript; the client half only places validation messages.
 */

const INITIAL: QuoteState = { status: "idle" };

const inputClass =
  "w-full border border-border bg-background px-4 py-2.5 text-sm placeholder:text-muted";

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) {
    return null;
  }

  return <p className="mt-1.5 text-sm text-accent">{errors[0]}</p>;
}

export function ProductEnquiryForm({ product }: { product: Service }) {
  const [state, formAction, pending] = useActionState(submitQuote, INITIAL);

  if (state.status === "success") {
    return (
      <div className="border-t-2 border-foreground pt-6">
        <h2 className="font-display text-3xl font-bold uppercase tracking-tight">
          Enquiry received
        </h2>

        <p className="mt-3 max-w-xl text-muted">
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
    <form action={formAction} className="max-w-3xl">
      {/* The product is fixed on this page, so it travels as a hidden field
          rather than a select the visitor has to fill in again. */}
      <input type="hidden" name="service_id" value={product.id} />

      {state.message && (
        <p
          aria-live="polite"
          className="mb-6 border border-accent px-4 py-3 text-sm text-accent"
        >
          {state.message}
        </p>
      )}

      <fieldset disabled={pending} className="space-y-6">
        <legend className="sr-only">Enquire about {product.title}</legend>

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="quantity" className="block text-sm font-semibold">
              Quantity
              {product.min_order_quantity && (
                <span className="ml-2 font-normal text-muted">
                  minimum {product.min_order_quantity}
                </span>
              )}
            </label>
            <input
              id="quantity"
              name="quantity"
              type="number"
              // The minimum order quantity is the floor and the sensible
              // starting value; asking for fewer is not an order we take.
              min={product.min_order_quantity ?? 1}
              defaultValue={product.min_order_quantity ?? 1}
              required
              className={inputClass}
            />
            <FieldError errors={state.errors?.["items.0.quantity"]} />
          </div>

          {(product.options ?? []).map((option) => {
            const field = `options[${option.name}]`;
            const id = `option-${option.id}`;

            return (
              <div key={option.id}>
                <label htmlFor={id} className="block text-sm font-semibold">
                  {option.name}
                  {!option.is_required && (
                    <span className="ml-2 font-normal text-muted">optional</span>
                  )}
                </label>

                {/*
                 * A `select` option offers its values; a `text` one is free
                 * input. `price_delta` is shown against each value because a
                 * surcharge the buyer only discovers in the quote is a bad
                 * surprise — but it never adds up to a total here, which stays
                 * staff-priced.
                 */}
                {option.type === "select" && option.values?.length ? (
                  <select
                    id={id}
                    name={field}
                    required={option.is_required}
                    defaultValue=""
                    className={inputClass}
                  >
                    <option value="">Choose {option.name.toLowerCase()}</option>
                    {option.values.map((value) => (
                      <option key={value.id} value={value.label}>
                        {value.label}
                        {value.price_delta && Number(value.price_delta) !== 0
                          ? ` (${Number(value.price_delta) > 0 ? "+" : ""}${value.price_delta})`
                          : ""}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    id={id}
                    name={field}
                    type="text"
                    required={option.is_required}
                    className={inputClass}
                  />
                )}
              </div>
            );
          })}

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
            <label htmlFor="company" className="block text-sm font-semibold">
              Club or company <span className="font-normal text-muted">optional</span>
            </label>
            <input id="company" name="company" type="text" className={inputClass} />
            <FieldError errors={state.errors?.company} />
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

          <div>
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
                size breakdown, colours, artwork, deadline
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
            Nothing is charged — we reply with a costed quote. Or email{" "}
            <a href={`mailto:${SITE.email}`} className="text-accent hover:underline">
              {SITE.email}
            </a>
          </p>
        </div>
      </fieldset>
    </form>
  );
}
