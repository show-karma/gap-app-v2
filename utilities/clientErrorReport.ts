const MAX_STACK_CHARS = 2_000;
const MAX_EXTRA_CHARS = 4_000;

type SerializedError = { name?: string; message?: string; stack?: string; code?: unknown };

const serializeError = (error: unknown): SerializedError => {
  if (error && typeof error === "object") {
    const e = error as { name?: unknown; message?: unknown; stack?: unknown; code?: unknown };
    return {
      name: typeof e.name === "string" ? e.name : undefined,
      message: typeof e.message === "string" ? e.message : String(error),
      stack: typeof e.stack === "string" ? e.stack.slice(0, MAX_STACK_CHARS) : undefined,
      code: e.code,
    };
  }
  return { message: String(error) };
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
