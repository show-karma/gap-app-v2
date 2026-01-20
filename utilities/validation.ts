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

/**
 * Sanitizes a string to only allow valid numeric input (digits and at most one decimal point).
 * Useful for amount/currency input fields.
 *
 * @param value - The raw input string to sanitize
 * @returns A sanitized string containing only digits and at most one decimal point
 *
 * @example
 * sanitizeNumericInput("123.45") // "123.45"
 * sanitizeNumericInput("12.34.56") // "12.3456"
 * sanitizeNumericInput("abc123def") // "123"
 * sanitizeNumericInput("1,234.56") // "1234.56"
 * sanitizeNumericInput("") // ""
 * sanitizeNumericInput(".5") // ".5"
 */
export function sanitizeNumericInput(value: string): string {
  // Remove all characters except digits and decimal points
  let sanitized = value.replace(/[^\d.]/g, "");

  // Ensure only one decimal point exists
  const parts = sanitized.split(".");
  if (parts.length > 2) {
    // Keep only the first decimal point, concatenate remaining parts
    sanitized = `${parts[0]}.${parts.slice(1).join("")}`;
  }

  return sanitized;
}
