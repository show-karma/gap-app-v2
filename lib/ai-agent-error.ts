import { AxiosError } from "axios";

const STATUS_MESSAGES: Record<number, string> = {
  400: "That request didn't look right. Try again.",
  401: "Your session expired. Sign in again to continue.",
  403: "You don't have access to this team.",
  404: "We couldn't find that.",
  409: "Something already exists with those details.",
  422: "We couldn't process that input.",
  429: "Too many requests — wait a moment and try again.",
  500: "Our backend hit a snag. Please try again.",
  502: "Couldn't reach the team's runtime. Try again shortly.",
  503: "The team's runtime is unavailable. Try again shortly.",
  504: "The team's runtime took too long to respond.",
};

interface ApiErrorBody {
  message?: unknown;
}

// Converts errors from the AI agent API client into something safe to render to
// users. We always prefer the friendly status copy over backend-supplied
// `message` fields, because those tend to be Python tracebacks, axios noise,
// or internal IDs that leak implementation detail.
export function humanizeApiError(err: unknown, fallback = "Something went wrong"): string {
  if (err instanceof AxiosError) {
    const status = err.response?.status;
    if (status && STATUS_MESSAGES[status]) {
      return STATUS_MESSAGES[status];
    }
    if (err.code === "ERR_NETWORK") {
      return "Couldn't reach the server. Check your connection.";
    }
    const body = err.response?.data as ApiErrorBody | undefined;
    if (body && typeof body.message === "string" && isUserSafeMessage(body.message)) {
      return body.message;
    }
  }
  if (err instanceof Error && err.message && isUserSafeMessage(err.message)) {
    return err.message;
  }
  return fallback;
}

// Heuristic: short, sentence-like strings without stack-trace markers are safe
// to render. Anything that looks like a traceback, JSON payload, or generic
// transport noise gets swallowed in favor of the fallback copy.
function isUserSafeMessage(msg: string): boolean {
  const trimmed = msg.trim();
  if (!trimmed) return false;
  if (trimmed.length > 200) return false;
  if (trimmed.startsWith("Request failed")) return false;
  if (/\bTraceback\b|\bError:\s*at\s|^\s*at\s|\n\s+at\s/.test(trimmed)) return false;
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) return false;
  return true;
}
