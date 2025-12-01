export function sanitizeInput<T>(input: T): T {
  if (typeof input === "string") {
    return input.trim() as T;
  }
  return input;
}

export function sanitizeObject(obj: any): any {
  if (typeof obj !== "object" || obj === null) {
    return sanitizeInput(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item));
  }

  const sanitizedObj: any = {};

  if (obj instanceof Date) {
    return obj;
  }

  for (const [key, value] of Object.entries(obj)) {
    sanitizedObj[key] = sanitizeObject(value);
  }

  return sanitizedObj;
}

/**
 * Sanitizes a community slug by removing characters that could cause routing issues
 * Removes trailing commas, periods, and other special characters that aren't part of valid slugs
 * @param slug The community slug to sanitize
 * @returns The sanitized slug
 */
export function sanitizeCommunitySlug(slug: string): string {
  return slug.replace(/[,.\s]+$/g, "").trim();
}

/**
 * Checks if a community slug contains forbidden characters and needs sanitization
 * @param slug The community slug to check
 * @returns True if the slug contains forbidden trailing characters
 */
export function hasForbiddenChars(slug: string): boolean {
  return /[,.\s]+$/.test(slug);
}
