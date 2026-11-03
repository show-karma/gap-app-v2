const MAX_STACK_CHARS = 2_000;
const MAX_EXTRA_CHARS = 4_000;

const NESTED_KEYS = [
  "info",
  "error",
  "cause",
  "originalError",
  "details",
  "data",
  "reason",
  "shortMessage",
] as const;
const MAX_DEPTH = 4;

type SerializedError = Record<string, unknown>;

/**
 * ethers wraps the provider's real response inside `info`/`error`, viem inside
 * `cause`/`details`, and our ApiError inside `originalError`. The top-level
 * message ("could not coalesce error") says nothing on its own, so the nested
 * chain is what makes a report actionable.
 */
const serializeError = (error: unknown, depth = 0): SerializedError => {
  if (!error || typeof error !== "object") {
    return { message: String(error) };
  }
  const e = error as Record<string, unknown>;
  const out: SerializedError = {
    name: typeof e.name === "string" ? e.name : undefined,
    message: typeof e.message === "string" ? e.message : undefined,
    code: e.code,
    status: e.status,
  };
  if (depth === 0 && typeof e.stack === "string") {
    out.stack = e.stack.slice(0, MAX_STACK_CHARS);
  }
  if (depth >= MAX_DEPTH) return out;
  for (const key of NESTED_KEYS) {
    const value = e[key];
    if (value === undefined || value === null) continue;
    out[key] = typeof value === "object" ? serializeError(value, depth + 1) : value;
  }
  return out;
};

const serializeExtra = (extra: unknown): string | undefined => {
  if (extra === undefined) return undefined;
  try {
    return JSON.stringify(extra).slice(0, MAX_EXTRA_CHARS);
  } catch {
    return undefined;
  }
};

/**
 * Mirrors an error to the app's own API route so it lands in the server runtime
 * logs. Sentry stays the primary sink; this is the fallback that still works
 * when the Sentry quota is exhausted. Fire-and-forget: never throws, never awaited.
 */
export const reportClientError = (errorMessage: string, error: unknown, extra?: unknown): void => {
  if (typeof window === "undefined" || typeof fetch !== "function") return;

  const body = JSON.stringify({
    errorMessage,
    error: serializeError(error),
    extra: serializeExtra(extra),
    url: window.location.href,
    at: new Date().toISOString(),
  });

  try {
    fetch("/api/client-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // Reporting must never break the caller.
  }
};
