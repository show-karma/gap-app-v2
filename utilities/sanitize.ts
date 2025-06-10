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
