import { z } from "zod";
import type { ApplicationQuestion } from "@/types/whitelabel-entities";

const metricSchema = z.object({
  metric: z.string().min(1, "Metric is required"),
  dataSource: z.string().min(1, "Data source is required"),
  howItsMeasured: z.string().min(1, "How it's measured is required"),
  target: z.string().min(1, "Target is required"),
});

export function buildMetricSchema(q: ApplicationQuestion) {
  const minMetrics = q.validation?.minMetrics || (q.required ? 1 : 0);
  const maxMetrics = q.validation?.maxMetrics || Number.POSITIVE_INFINITY;

  if (q.required) {
    let fieldSchema: z.ZodType = z
      .union([z.array(metricSchema), z.undefined(), z.null()])
      .refine((val) => val !== undefined && val !== null, {
        message: "This field is required",
      });

    if (minMetrics > 0) {
      fieldSchema = fieldSchema.refine(
        (val: unknown) => Array.isArray(val) && val.length >= minMetrics,
        {
          message: `Please add at least ${minMetrics} metric${minMetrics > 1 ? "s" : ""}`,
        }
      );
    }

    if (maxMetrics !== Number.POSITIVE_INFINITY) {
      fieldSchema = fieldSchema.refine(
        (val: unknown) => Array.isArray(val) && val.length <= maxMetrics,
        {
          message: `Maximum ${maxMetrics} metric${maxMetrics > 1 ? "s" : ""} allowed`,
        }
      );
    }

    return fieldSchema;
  }

  if (minMetrics > 0 || maxMetrics !== Number.POSITIVE_INFINITY) {
    let arrSchema = z.array(metricSchema);

    if (minMetrics > 0) {
      arrSchema = arrSchema.min(
        minMetrics,
        `Please add at least ${minMetrics} metric${minMetrics > 1 ? "s" : ""}`
      );
    }

    if (maxMetrics !== Number.POSITIVE_INFINITY) {
      arrSchema = arrSchema.max(
        maxMetrics,
        `Maximum ${maxMetrics} metric${maxMetrics > 1 ? "s" : ""} allowed`
      );
    }

    return z.union([arrSchema, z.undefined(), z.null()]);
  }

  return z.union([z.array(metricSchema), z.undefined(), z.null()]);
}
