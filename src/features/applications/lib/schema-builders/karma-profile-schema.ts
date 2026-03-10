import { z } from "zod";
import type { ApplicationQuestion } from "@/types/whitelabel-entities";

const KARMA_PROJECT_UID_PATTERN = /^0x[a-fA-F0-9]{64}$/;

export function buildKarmaProfileLinkSchema(q: ApplicationQuestion) {
  if (q.required) {
    return z
      .union([z.string(), z.undefined(), z.null()])
      .refine((val) => val !== undefined && val !== null && val !== "", {
        message: "This field is required",
      })
      .refine((val) => typeof val === "string" && KARMA_PROJECT_UID_PATTERN.test(val), {
        message: "Please select a valid project",
      });
  }

  return z.union([
    z.string().regex(KARMA_PROJECT_UID_PATTERN, "Invalid project UID"),
    z.literal(""),
    z.null(),
    z.undefined(),
  ]);
}

export function buildDefaultSchema(q: ApplicationQuestion) {
  if (q.required) {
    return z
      .union([z.string(), z.undefined(), z.null()])
      .refine((val) => val !== undefined && val !== null && val !== "", {
        message: "This field is required",
      });
  }

  return z.union([z.string(), z.literal(""), z.null(), z.undefined()]);
}
