const MAX_STACK_CHARS = 2_000;
const MAX_EXTRA_CHARS = 16_000;

const MAX_DEPTH = 4;
const MAX_KEYS = 40;
const SKIPPED_KEYS = new Set(["config", "request", "response", "headers", "stack"]);

type SerializedError = Record<string, unknown>;

/**
 * ethers wraps the provider's real response inside `info`/`error`, viem inside
 * `cause`/`details`, and our ApiError inside `originalError`. The top-level
 * message ("could not coalesce error") says nothing on its own, so every own
 * property is kept (bounded by depth and key count). Axios-style
 * `config`/`request`/`response`/`headers` are skipped: that is where auth
 * headers and full bodies live, and they carry no diagnostic signal here.
 */
const serializeError = (error: unknown, depth = 0): SerializedError => {
  if (!error || typeof error !== "object") {
    return { message: String(error) };
  }
  const e = error as Record<string, unknown>;
  const out: SerializedError = {};
  if (error instanceof Error) {
    out.name = error.name;
    out.message = error.message;
    if (depth === 0 && typeof error.stack === "string") {
      out.stack = error.stack.slice(0, MAX_STACK_CHARS);
    }
  }
  for (const key of Object.getOwnPropertyNames(e).slice(0, MAX_KEYS)) {
    if (SKIPPED_KEYS.has(key) || key in out) continue;
    const value = e[key];
    if (value === undefined || value === null || typeof value === "function") continue;
    if (typeof value !== "object") {
      out[key] = value;
    } else if (depth < MAX_DEPTH) {
      out[key] = Array.isArray(value)
        ? value
            .slice(0, MAX_KEYS)
            .map((item) =>
              typeof item === "object" && item ? serializeError(item, depth + 1) : item
            )
        : serializeError(value, depth + 1);
    } else {
      out[key] = "[truncated]";
    }
  }
  return out;
};

const serializeExtra = (extra: unknown): unknown => {
  if (extra === undefined) return undefined;
  try {
    const json = JSON.stringify(extra);
    return json.length > MAX_EXTRA_CHARS ? json.slice(0, MAX_EXTRA_CHARS) : JSON.parse(json);
  } catch {
    return undefined;
  }
};

/**
 * Mirrors an error to the app's own API route so it lands in the server runtime
 * logs. Sentry stays the primary sink; this is the fallback that still works
 * when the Sentry quota is exhausted. Fire-and-forget: never throws, never awaited.
 */
const SENSITIVE_KEY =
  /authorization|cookie|token|api[-_]?key|secret|password|private|mnemonic|seed|credential/i;
const SENSITIVE_VALUE =
  /\b(Bearer\s+[A-Za-z0-9._-]+|karma_[A-Za-z0-9]+|sk-[A-Za-z0-9_-]{8,}|eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,})/g;
const REDACTED = "[redacted]";

const redactValue = (value: unknown, depth = 0): unknown => {
  if (typeof value === "string") return value.replace(SENSITIVE_VALUE, REDACTED);
  if (!value || typeof value !== "object" || depth > 8) return value;
  if (Array.isArray(value)) return value.map((item) => redactValue(item, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [key, inner] of Object.entries(value as Record<string, unknown>)) {
    out[key] = SENSITIVE_KEY.test(key) ? REDACTED : redactValue(inner, depth + 1);
  }
  return out;
};

const safeUrl = (): string => `${window.location.origin}${window.location.pathname}`;

type InjectedProvider = {
  isMetaMask?: boolean;
  isRabby?: boolean;
  isCoinbaseWallet?: boolean;
  isBraveWallet?: boolean;
  isPhantom?: boolean;
  providers?: unknown[];
};

const injectedWalletFlags = (): Record<string, unknown> | undefined => {
  const eth = (window as unknown as { ethereum?: InjectedProvider }).ethereum;
  if (!eth) return undefined;
  return {
    isMetaMask: eth.isMetaMask,
    isRabby: eth.isRabby,
    isCoinbaseWallet: eth.isCoinbaseWallet,
    isBraveWallet: eth.isBraveWallet,
    isPhantom: eth.isPhantom,
    providers: Array.isArray(eth.providers) ? eth.providers.length : undefined,
  };
};

const browserEnv = () => ({
  userAgent: navigator.userAgent,
  language: navigator.language,
  online: navigator.onLine,
  injectedWallet: injectedWalletFlags(),
});

export const reportClientError = (errorMessage: string, error: unknown, extra?: unknown): void => {
  if (typeof window === "undefined" || typeof fetch !== "function") return;

  const body = JSON.stringify(
    redactValue({
      errorMessage,
      error: serializeError(error),
      extra: serializeExtra(extra),
      url: safeUrl(),
      at: new Date().toISOString(),
      browser: browserEnv(),
    })
  );

  try {
    fetch("/api/client-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).then(undefined, () => undefined);
  } catch {
    // SUPPRESSED: reporting must never break the caller; there is no second sink to fall back to.
  }
};
