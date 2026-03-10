import { z } from "zod";
import type { ApplicationQuestion } from "@/types/whitelabel-entities";

const MAX_PATTERN_LENGTH = 500;

/**
 * Detects regex patterns vulnerable to catastrophic backtracking (ReDoS).
 *
 * Catches: nested quantifiers (e.g. (a+)+, (a*)*), adjacent quantifiers (++, **),
 * quantified groups followed by quantifiers, and overlapping alternation with quantifiers.
 */
const DANGEROUS_PATTERN_CHARS =
  /(\+\+|\*\*|\*\+|\+\*|\{\d+,\d*\}\{|\{\d+,\d*\}\+|\{\d+,\d*\}\*|\([^)]*[+*][^)]*\)[+*{]|([+*])\s*\2)/;

function isSafePattern(pattern: string): boolean {
  if (pattern.length > MAX_PATTERN_LENGTH) {
    return false;
  }
  if (DANGEROUS_PATTERN_CHARS.test(pattern)) {
    return false;
  }
  try {
    new RegExp(pattern);
    return true;
  } catch {
    return false;
  }
}

export function buildTextSchema(q: ApplicationQuestion) {
  if (q.required) {
    let fieldSchema: z.ZodTypeAny = z
      .union([z.string(), z.undefined(), z.null()])
      .refine((val) => val !== undefined && val !== null && val !== "", {
        message: "This field is required",
      });

    if (q.validation?.min && q.validation.min >= 1) {
      fieldSchema = fieldSchema.refine(
        (val: unknown) => typeof val === "string" && val.length >= q.validation!.min!,
        {
          message: `Minimum ${q.validation.min} characters required`,
        }
      );
    }

    if (q.validation?.maxLength) {
      fieldSchema = fieldSchema.refine(
        (val: unknown) => typeof val === "string" && val.length <= q.validation!.maxLength!,
        {
          message: `Maximum ${q.validation.maxLength} characters allowed`,
        }
      );
    }

    if (q.validation?.pattern && isSafePattern(q.validation.pattern)) {
      const compiledPattern = new RegExp(q.validation.pattern);
      fieldSchema = fieldSchema.refine(
        (val: unknown) => typeof val === "string" && compiledPattern.test(val),
        {
          message: "Invalid format",
        }
      );
    }

    return fieldSchema;
  }

  const hasMin = q.validation?.min && q.validation.min >= 1;
  const hasMax = q.validation?.maxLength;
  const hasPattern = q.validation?.pattern && isSafePattern(q.validation.pattern);

  let stringSchema = z.string();

  if (hasMin) {
    stringSchema = stringSchema.min(
      q.validation!.min!,
      `Minimum ${q.validation!.min} characters required`
    );
  }

  if (hasMax) {
    stringSchema = stringSchema.max(
      q.validation!.maxLength!,
      `Maximum ${q.validation!.maxLength} characters allowed`
    );
  }

  if (hasPattern) {
    stringSchema = stringSchema.regex(new RegExp(q.validation!.pattern!), "Invalid format");
  }

  return z.union([stringSchema, z.literal(""), z.null(), z.undefined()]);
}

export function buildEmailSchema(q: ApplicationQuestion) {
  if (q.required) {
    return z
      .union([z.string(), z.undefined(), z.null()])
      .refine((val) => val !== undefined && val !== null && val !== "", {
        message: "This field is required",
      })
      .refine(
        (val) => {
          if (typeof val === "string" && val.length > 0) {
            return z.string().email().safeParse(val).success;
          }
          return true;
        },
        { message: "Please enter a valid email address" }
      );
  }

  return z.union([
    z.string().email("Please enter a valid email address"),
    z.literal(""),
    z.null(),
    z.undefined(),
  ]);
}

export function buildUrlSchema(q: ApplicationQuestion) {
  if (q.required) {
    return z
      .union([z.string(), z.undefined(), z.null()])
      .refine((val) => val !== undefined && val !== null && val !== "", {
        message: "This field is required",
      })
      .refine(
        (val) => {
          if (typeof val === "string" && val.length > 0) {
            return z.string().url().safeParse(val).success;
          }
          return true;
        },
        { message: "Please enter a valid URL" }
      );
  }

  return z.union([
    z.string().url("Please enter a valid URL"),
    z.literal(""),
    z.null(),
    z.undefined(),
  ]);
}
