import { z } from "zod";
import type { ApplicationQuestion } from "@/types/whitelabel-entities";

export function buildSelectSchema(q: ApplicationQuestion) {
  if (q.options && q.options.length > 0) {
    const values = q.options.map((opt) => opt.value) as [string, ...string[]];

    if (q.required) {
      return z
        .union([z.enum(values), z.undefined(), z.null(), z.literal("")])
        .refine((val) => val !== undefined && val !== null && val !== "", {
          message: "Please select an option",
        });
    }

    return z.union([z.enum(values), z.literal(""), z.undefined()]);
  }

  if (q.required) {
    return z
      .union([z.string(), z.undefined(), z.null()])
      .refine((val) => val !== undefined && val !== null && val !== "", {
        message: "Please select an option",
      });
  }

  return z.union([z.string(), z.literal(""), z.undefined()]);
}

export function buildMultiselectSchema(q: ApplicationQuestion) {
  if (q.required) {
    return z
      .union([z.array(z.string()), z.undefined(), z.null()])
      .refine((val) => val !== undefined && val !== null, {
        message: "This field is required",
      })
      .refine((val) => Array.isArray(val) && val.length > 0, {
        message: "Select at least one option",
      });
  }

  return z.union([z.array(z.string()), z.undefined(), z.null()]);
}
