import { z } from "zod";
import { optionalString, requiredString } from "@/utilities/validation/zod-primitives";

/**
 * Single source of truth for the sub-fields of repeatable milestone and metric
 * inputs. These were previously declared inline inside
 * `ApplicationSubmission.generateValidationSchema`, which is wired with a
 * zodResolver — so the schema is the SOLE validation authority and any
 * per-Controller `rules` are dead code.
 *
 * Issue #1179: the milestone `description` was required here while the UI
 * advertised it as optional (PR #1174). It is now `optionalString()` — the one
 * declaration of its required-ness — and the UI derives its indicator from this
 * schema via `MILESTONE_FIELD_REQUIRED` so the two can never disagree again.
 */
export const milestoneItemSchema = z.object({
  title: requiredString("Milestone title", {
    messages: { required: "Milestone title is required" },
  }),
  description: optionalString(),
  dueDate: requiredString("Due date", { messages: { required: "Due date is required" } }),
  fundingRequested: requiredString("Milestone funding requested", {
    messages: { required: "Milestone funding requested is required" },
  }),
  completionCriteria: requiredString("Completion criteria", {
    messages: { required: "Completion criteria is required" },
  }),
});

export const metricItemSchema = z.object({
  metric: requiredString("Metric", { messages: { required: "Metric is required" } }),
  dataSource: requiredString("Data source", { messages: { required: "Data source is required" } }),
  howItsMeasured: requiredString("How it's measured", {
    messages: { required: "How it's measured is required" },
  }),
  target: requiredString("Target", { messages: { required: "Target is required" } }),
});

/**
 * Derive a `{ field: isRequired }` map from a Zod object schema by reading each
 * shape entry's `.isOptional()`. UI components use this to render asterisks and
 * `isRequired` props, guaranteeing they are a projection of the schema rather
 * than a hand-maintained duplicate.
 */
export function deriveRequiredMap<Shape extends z.ZodRawShape>(
  schema: z.ZodObject<Shape>
): Record<keyof Shape, boolean> {
  const entries = Object.entries(schema.shape).map(([key, fieldSchema]) => [
    key,
    !(fieldSchema as z.ZodType).isOptional(),
  ]);
  return Object.fromEntries(entries) as Record<keyof Shape, boolean>;
}

export const MILESTONE_FIELD_REQUIRED = deriveRequiredMap(milestoneItemSchema);
export const METRIC_FIELD_REQUIRED = deriveRequiredMap(metricItemSchema);
