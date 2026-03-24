import type { ZodSchema, ZodError } from "zod";

/**
 * Validates MSW response data against a Zod schema at handler setup time.
 *
 * If validation fails, an error is thrown immediately so that broken
 * MSW fixtures surface during test setup rather than causing cryptic
 * failures later in the test run.
 */
export function validateResponse<T>(schema: ZodSchema<T>, data: unknown, context: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const formatted = formatZodError(result.error);
    throw new Error(
      `[MSW] Response validation failed for "${context}".\n` +
        `Data does not match the Zod contract schema.\n${formatted}`
    );
  }
  return result.data;
}

function formatZodError(error: ZodError): string {
  return error.issues
    .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
    .join("\n");
}
