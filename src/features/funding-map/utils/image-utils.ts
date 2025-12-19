/**
 * Checks if a value is a valid image URL.
 * Filters out empty strings and malformed "[object Object]" strings.
 */
export function isValidImageUrl(img: unknown): img is string {
  return typeof img === "string" && img.length > 0 && !img.includes("[object");
}
