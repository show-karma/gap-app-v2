import { z } from "zod";

/**
 * Telegram username constraints (per Telegram docs):
 * - 5–32 characters total
 * - May only contain letters (a–z, A–Z), digits, and underscores
 * - Must start with a letter
 * - Must end with a letter or digit
 * - Cannot contain consecutive underscores ("__")
 *
 * The shared regex below enforces all of the above. The leading "@" must
 * already be stripped by the caller (input fields render an "@" prefix or
 * helper text — the user only enters the bare username).
 */
export const TELEGRAM_USERNAME_REGEX = /^[a-zA-Z](?!.*__)[a-zA-Z0-9_]{3,30}[a-zA-Z0-9]$/;

export const TELEGRAM_USERNAME_ERROR =
  "Use 5-32 letters/numbers/underscores, starting with a letter and ending with a letter or number";

/**
 * Reusable Zod schema for an optional Telegram username field.
 * Accepts either a valid username or an empty string (to allow clearing the
 * field). Use this in any form that collects a Telegram handle.
 */
export const telegramUsernameSchema = z
  .string()
  .regex(TELEGRAM_USERNAME_REGEX, TELEGRAM_USERNAME_ERROR)
  .or(z.literal(""));

/**
 * Imperative validator for non-Zod call sites. Returns true when the value
 * matches a valid Telegram username (or is the empty string). Useful for
 * inline validation outside of React Hook Form.
 */
export const validateTelegramUsername = (value: string): boolean => {
  if (value === "") return true;
  return TELEGRAM_USERNAME_REGEX.test(value);
};
