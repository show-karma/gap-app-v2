import { z } from "zod";
import type { ApplicationQuestion } from "@/types/whitelabel-entities";

export function buildNumberSchema(q: ApplicationQuestion) {
  if (q.required) {
    let fieldSchema: z.ZodTypeAny = z
      .union([z.number(), z.undefined(), z.null()])
      .refine((val) => val !== undefined && val !== null, {
        message: "This field is required",
      });

    if (q.validation?.min !== undefined) {
      fieldSchema = fieldSchema.refine(
        (val: unknown) => typeof val === "number" && val >= q.validation!.min!,
        {
          message: `Minimum value is ${q.validation.min}`,
        }
      );
    }

    if (q.validation?.max !== undefined) {
      fieldSchema = fieldSchema.refine(
        (val: unknown) => typeof val === "number" && val <= q.validation!.max!,
        {
          message: `Maximum value is ${q.validation.max}`,
        }
      );
    }

    return fieldSchema;
  }

  if (q.validation?.min !== undefined || q.validation?.max !== undefined) {
    let numSchema = z.number();

    if (q.validation?.min !== undefined) {
      numSchema = numSchema.min(q.validation.min, `Minimum value is ${q.validation.min}`);
    }

    if (q.validation?.max !== undefined) {
      numSchema = numSchema.max(q.validation.max, `Maximum value is ${q.validation.max}`);
    }

    return z.union([numSchema, z.null(), z.undefined()]);
  }

  return z.union([z.number(), z.null(), z.undefined()]);
}

export function buildDateSchema(q: ApplicationQuestion) {
  if (q.required) {
    return z
      .union([z.string(), z.date(), z.undefined(), z.null()])
      .refine(
        (val) => val !== undefined && val !== null && (typeof val === "string" ? val !== "" : true),
        {
          message: "This field is required",
        }
      );
  }

  return z.union([z.string(), z.date(), z.literal(""), z.null(), z.undefined()]);
}
