"use server";

import { ApiError, ApiValidationError, apiPost } from "@/lib/api";

/**
 * Submitting a quote enquiry.
 *
 * A server action rather than a fetch from the browser: the request then never
 * leaves the server, so it needs no CORS allowance, exposes no API host, and
 * the form still submits with JavaScript disabled.
 */

export type QuoteState = {
  status: "idle" | "success" | "error";
  /** The reference to show the customer on success. */
  orderNumber?: string;
  /** Keyed by the API's field path, e.g. `items.0.quantity`. */
  errors?: Record<string, string[]>;
  message?: string;
};

export async function submitQuote(
  _previous: QuoteState,
  formData: FormData,
): Promise<QuoteState> {
  const value = (name: string) => {
    const raw = formData.get(name);

    return typeof raw === "string" && raw.trim() !== "" ? raw.trim() : undefined;
  };

  const serviceId = Number(formData.get("service_id"));
  const quantity = Number(formData.get("quantity"));

  /*
   * Option inputs are named `options[Size]`, so the chosen values arrive keyed
   * by the option's own name — which is exactly the shape `order_items.options`
   * stores. Blank entries are dropped rather than recorded as empty choices.
   */
  const options: Record<string, string> = {};

  for (const [key, value] of formData.entries()) {
    const match = key.match(/^options\[(.+)\]$/);

    if (match && typeof value === "string" && value.trim() !== "") {
      options[match[1]] = value.trim();
    }
  }

  try {
    const response = await apiPost("orders", {
      customer_name: value("customer_name"),
      customer_email: value("customer_email"),
      customer_phone: value("customer_phone"),
      company: value("company"),
      customer_note: value("customer_note"),
      items: [
        {
          // `NaN` rather than a coerced 0 when the field is blank, so the API's
          // own validation reports it instead of this action guessing.
          service_id: Number.isFinite(serviceId) ? serviceId : null,
          quantity: Number.isFinite(quantity) ? quantity : null,
          ...(Object.keys(options).length > 0 ? { options } : {}),
        },
      ],
    });

    const data = response.data as { order_number?: string } | undefined;

    return { status: "success", orderNumber: data?.order_number };
  } catch (error) {
    if (error instanceof ApiValidationError) {
      return {
        status: "error",
        errors: error.errors,
        message: "Please check the highlighted fields.",
      };
    }

    // The endpoint is rate limited; a burst gets a 429 rather than a fault, and
    // telling someone to try again is more use than "something went wrong".
    if (error instanceof ApiError && error.status === 429) {
      return {
        status: "error",
        message: "Too many enquiries from this connection. Try again shortly.",
      };
    }

    return {
      status: "error",
      message:
        "We could not send your enquiry. Please try again, or email us directly.",
    };
  }
}
