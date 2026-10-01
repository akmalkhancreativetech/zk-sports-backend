import { z } from "zod";

/**
 * The single door to the Laravel API.
 *
 * Every read goes through `apiGet`, which resolves the base URL, applies the
 * cache policy, and parses the response through a Zod schema. Nothing else in
 * the app should call `fetch` against the API directly — one place to parse
 * means one place a contract change is reported from.
 *
 * The credentialed half of this module — the `/sanctum/csrf-cookie` handshake
 * and the mutating requests that need it — arrives with Phase 3 of
 * docs/frontend-plan.md. Until public users can log in there is nothing to
 * authenticate, and writing that code now would mean guessing at it.
 */

/**
 * `API_URL` is server-only and may point somewhere the browser cannot reach;
 * `NEXT_PUBLIC_API_URL` is the browser's view. Server components prefer the
 * former and fall back, so a single value in .env.local covers dev.
 */
const BASE_URL = (
  process.env.API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:8000"
).replace(/\/$/, "");

export const API_V1 = `${BASE_URL}/api/v1`;

/** Raised for any non-2xx response, carrying the status so callers can branch. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly path: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }
}

/** Raised when a 2xx response does not match the schema it was read against. */
export class ApiContractError extends Error {
  constructor(
    readonly path: string,
    readonly issues: z.core.$ZodIssue[],
  ) {
    const summary = issues
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("; ");

    super(`Unexpected payload from ${path} — ${summary}`);
    this.name = "ApiContractError";
  }
}

type GetOptions = {
  /**
   * Seconds to cache the response for. Next 16 does not cache `fetch`
   * implicitly, so this is opt-in per call: public content is safe to hold
   * briefly, and anything user-specific must pass `revalidate: 0`.
   */
  revalidate?: number;
  searchParams?: Record<string, string | number | undefined>;
};

const DEFAULT_REVALIDATE = 60;

/**
 * GET a v1 endpoint and parse it. Throws `ApiError` for a non-2xx response and
 * `ApiContractError` when the body does not match `schema`.
 */
export async function apiGet<T extends z.ZodTypeAny>(
  path: string,
  schema: T,
  { revalidate = DEFAULT_REVALIDATE, searchParams }: GetOptions = {},
): Promise<z.infer<T>> {
  const url = new URL(`${API_V1}/${path.replace(/^\//, "")}`);

  for (const [key, value] of Object.entries(searchParams ?? {})) {
    if (value !== undefined && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    next: { revalidate },
  });

  if (!response.ok) {
    throw new ApiError(
      response.status,
      path,
      `GET ${url.pathname} responded ${response.status}`,
    );
  }

  const parsed = schema.safeParse(await response.json());

  if (!parsed.success) {
    throw new ApiContractError(path, parsed.error.issues);
  }

  return parsed.data;
}

/** Laravel's 422 body: a message plus per-field arrays of messages. */
export type ValidationErrors = Record<string, string[]>;

/**
 * Raised for a 422, carrying the field errors so a form can place each message
 * against its input rather than showing one generic failure.
 */
export class ApiValidationError extends Error {
  constructor(
    readonly path: string,
    readonly errors: ValidationErrors,
  ) {
    super(`Validation failed for ${path}`);
    this.name = "ApiValidationError";
  }
}

/**
 * POST a v1 endpoint.
 *
 * Called from server actions, never the browser: the request then carries no
 * cookies and crosses no origin, so it needs neither CORS nor the CSRF
 * handshake, and `API_URL` can point somewhere the public internet cannot
 * reach.
 *
 * Throws `ApiValidationError` for a 422 and `ApiError` for anything else
 * non-2xx. The response body is returned unparsed — this API's writes return a
 * reference, not a resource, and a schema for `{ order_number }` would be
 * ceremony.
 */
export async function apiPost(
  path: string,
  body: unknown,
): Promise<Record<string, unknown>> {
  const url = `${API_V1}/${path.replace(/^\//, "")}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    // A write must never be served from, or written to, a cache.
    cache: "no-store",
  });

  if (response.status === 422) {
    const payload = (await response.json()) as { errors?: ValidationErrors };

    throw new ApiValidationError(path, payload.errors ?? {});
  }

  if (!response.ok) {
    throw new ApiError(
      response.status,
      path,
      `POST ${path} responded ${response.status}`,
    );
  }

  return (await response.json()) as Record<string, unknown>;
}

/**
 * As `apiGet`, but a 404 resolves to `null` instead of throwing — for the
 * "absent is a legitimate state" case, such as a slider key with no slider
 * behind it yet. A caller that wants a 404 page should use `apiGet` and let the
 * error reach `notFound()`.
 */
export async function apiGetOrNull<T extends z.ZodTypeAny>(
  path: string,
  schema: T,
  options: GetOptions = {},
): Promise<z.infer<T> | null> {
  try {
    return await apiGet(path, schema, options);
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound) {
      return null;
    }

    throw error;
  }
}
