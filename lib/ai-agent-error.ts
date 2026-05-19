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
// users. Axios surfaces raw "Request failed with status code 401" strings that
// leak implementation detail; this maps known statuses to friendly copy and
// prefers the server's `message` field when it's present.
export function humanizeApiError(err: unknown, fallback = "Something went wrong"): string {
  if (err instanceof AxiosError) {
    const body = err.response?.data as ApiErrorBody | undefined;
    if (body && typeof body.message === "string" && body.message.trim()) {
      return body.message;
    }
    const status = err.response?.status;
    if (status && STATUS_MESSAGES[status]) {
      return STATUS_MESSAGES[status];
    }
    if (err.code === "ERR_NETWORK") {
      return "Couldn't reach the server. Check your connection.";
    }
  }
  if (err instanceof Error && err.message && !err.message.startsWith("Request failed")) {
    return err.message;
  }
  return fallback;
}
