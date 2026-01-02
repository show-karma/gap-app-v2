/**
 * Validation utilities for common patterns
 */

/**
 * Regex pattern for validating project UIDs (66-character hex string starting with 0x)
 * Matches: 0x followed by exactly 64 hex characters (a-f, A-F, 0-9)
 */
export const PROJECT_UID_REGEX = /^0x[a-fA-F0-9]{64}$/;

/**
 * Validates if a string is a valid project UID
 * @param value - The string to validate
 * @returns true if the value is a valid 66-character hex UID
 */
export function isValidProjectUid(value: unknown): value is string {
  return typeof value === "string" && PROJECT_UID_REGEX.test(value);
}
