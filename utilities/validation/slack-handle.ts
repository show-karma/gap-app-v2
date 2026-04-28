import { z } from "zod";

/**
 * Slack handle constraints (flexible, practical subset):
 * - 2–80 characters total
 * - Letters, digits, dots, underscores, and hyphens
 *
 * A leading "@" is allowed on input but should be stripped by the caller
 * before storage.
 */
export const SLACK_HANDLE_REGEX = /^@?[a-zA-Z0-9._-]{2,80}$/;

export const SLACK_HANDLE_ERROR =
  "Use 2-80 letters, digits, '.', '_' or '-', with an optional leading @";

/**
 * Reusable Zod schema for an optional Slack handle field. Accepts either a
 * valid handle or an empty string (to allow clearing the field).
 */
export const slackHandleSchema = z
  .string()
  .regex(SLACK_HANDLE_REGEX, SLACK_HANDLE_ERROR)
  .or(z.literal(""));

export const validateSlackHandle = (value: string): boolean => {
  if (value === "") return true;
  return SLACK_HANDLE_REGEX.test(value);
};
