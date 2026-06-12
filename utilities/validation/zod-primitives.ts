import { z } from "zod";
import { urlRegex } from "@/utilities/regexs/urlRegex";

/**
 * Shared Zod validation primitives — the single source of truth for the
 * required/optional/length/url/email idioms that were previously re-invented
 * (and frequently mis-ordered) in every form across the app.
 *
 * Key invariant: a `required` field whose value is empty ALWAYS reports a
 * "{label} is required" message, never a length message. This is enforced by
 * chaining `.trim().min(1, required)` BEFORE any length `.min(...)`, so the
 * required check fails first for empty/whitespace input.
 *
 * The builders intentionally return the concrete Zod types (`ZodString`, etc.)
 * rather than a widened `ZodType` so callers can keep chaining (e.g. `.regex`)
 * and so `z.infer` resolves to `string` for form typing.
 */

interface RequiredStringMessages {
  /** Message when the trimmed value is empty. Defaults to "{label} is required". */
  required?: string;
  /** Message when the value is shorter than `min`. */
  min?: string;
  /** Message when the value is longer than `max`. */
  max?: string;
}

interface RequiredStringOptions {
  min?: number;
  max?: number;
  messages?: RequiredStringMessages;
}

/**
 * A required, trimmed string.
 *
 * - Empty / whitespace-only input -> `"{label} is required"` (or `messages.required`).
 * - Shorter than `min` -> `messages.min` (or a sensible default).
 * - Longer than `max` -> `messages.max` (or a sensible default).
 */
export function requiredString(label: string, options: RequiredStringOptions = {}): z.ZodString {
  const { min, max, messages } = options;
  const requiredMessage = messages?.required ?? `${label} is required`;

  let schema = z.string().trim().min(1, requiredMessage);

  if (min !== undefined && min > 1) {
    const minMessage = messages?.min ?? `${label} must be at least ${min} characters`;
    schema = schema.min(min, minMessage);
  }

  if (max !== undefined) {
    const maxMessage = messages?.max ?? `${label} must be at most ${max} characters`;
    schema = schema.max(max, maxMessage);
  }

  return schema;
}

interface OptionalStringOptions {
  min?: number;
  max?: number;
  /** Message when a non-empty value is shorter than `min`. */
  minMessage?: string;
  /** Message when a value is longer than `max`. */
  maxMessage?: string;
}

/**
 * An optional string that also accepts the empty string. Encapsulates the
 * `.optional().or(z.literal(""))` idiom duplicated across ~11 schemas.
 *
 * When `min`/`max` are supplied the constraints apply only to non-empty values
 * (the empty string short-circuits via the `z.literal("")` branch).
 */
export function optionalString(options: OptionalStringOptions = {}) {
  const { min, max, minMessage, maxMessage } = options;

  let base = z.string();
  if (min !== undefined) {
    base = base.min(min, minMessage ?? `Must be at least ${min} characters`);
  }
  if (max !== undefined) {
    base = base.max(max, maxMessage ?? `Must be at most ${max} characters`);
  }

  return base.optional().or(z.literal(""));
}

/**
 * A required URL validated against the shared `urlRegex`. Empty input reports
 * the required message; a malformed value reports the URL message.
 */
export function requiredUrl(
  label: string,
  messages?: { required?: string; invalid?: string }
): z.ZodString {
  const requiredMessage = messages?.required ?? `${label} is required`;
  const invalidMessage = messages?.invalid ?? "Please enter a valid URL";

  return z.string().trim().min(1, requiredMessage).regex(urlRegex, invalidMessage);
}

/**
 * An optional URL: accepts empty/undefined, otherwise must match `urlRegex`.
 */
export function optionalUrl(invalidMessage = "Please enter a valid URL") {
  return z.string().trim().regex(urlRegex, invalidMessage).optional().or(z.literal(""));
}

/**
 * An optional email: accepts empty/undefined, otherwise must be a valid email.
 */
export function optionalEmail(invalidMessage = "Please enter a valid email") {
  return z.union([z.literal(""), z.email(invalidMessage)]).optional();
}
