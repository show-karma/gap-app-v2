import { z } from "zod";
import { optionalString, requiredString, requiredUrl } from "@/utilities/validation/zod-primitives";

/** Strips anything that isn't a lowercase letter, number, or hyphen. */
export function normalizeSlug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9-]/g, "");
}

/**
 * Validation for the AI-team onboarding wizard. Mirrors the four fields
 * gap-indexer's `POST /v2/hermes/orgs/:slug/provision` accepts. Built from the
 * shared primitives so required/length/URL messages stay consistent with the
 * rest of the app and empty fields report "is required" rather than a length or
 * format error.
 */
export const onboardingSchema = z.object({
  slug: requiredString("Organization handle", {
    messages: { required: "Organization handle is required" },
  }).regex(/^[a-z0-9-]+$/, "Use only lowercase letters, numbers, and hyphens"),
  containerUrl: requiredUrl("Runtime URL"),
  sessionToken: requiredString("Runtime session token", {
    min: 16,
    messages: {
      required: "Runtime session token is required",
      min: "Runtime session token must be at least 16 characters",
    },
  }),
  communityId: optionalString(),
});

export type OnboardingFormValues = z.infer<typeof onboardingSchema>;
