import { z } from "zod";

interface RepeatableObjectSchemaOptions {
  required?: boolean;
  label: string;
  min?: number;
  max?: number;
  minMessage: (count: number) => string;
  maxMessage: (count: number) => string;
}

/**
 * Build a Zod schema for a repeatable object field (e.g. milestones, metrics).
 * Required fields enforce at least `min` (or 1) entries and at most `max`;
 * optional fields accept the array, undefined, or an empty array.
 */
export function buildRepeatableObjectSchema(
  objectSchema: z.ZodTypeAny,
  { required, label, min, max, minMessage, maxMessage }: RepeatableObjectSchemaOptions
): z.ZodType {
  if (required) {
    let arr = min
      ? z.array(objectSchema).min(min, minMessage(min))
      : z.array(objectSchema).min(1, `${label} is required`);
    if (max) arr = arr.max(max, maxMessage(max));
    return arr;
  }

  return z.array(objectSchema).optional().or(z.array(objectSchema).length(0));
}
