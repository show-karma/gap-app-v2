import pluralize from "pluralize";
import { z } from "zod";
import type { ApplicationQuestion } from "@/types/whitelabel-entities";

const metricSchema = z.object({
  metric: z.string().min(1, "Metric is required"),
  dataSource: z.string().min(1, "Data source is required"),
  howItsMeasured: z.string().min(1, "How it's measured is required"),
  target: z.string().min(1, "Target is required"),
});

const isNullish = (val: unknown): boolean => val === null || val === undefined;

export function buildMetricSchema(q: ApplicationQuestion) {
  const minMetrics = q.validation?.minMetrics ?? (q.required ? 1 : 0);
  const maxMetrics = q.validation?.maxMetrics ?? Number.POSITIVE_INFINITY;

  if (q.required) {
    let fieldSchema: z.ZodType = z
      .union([z.array(metricSchema), z.undefined(), z.null()])
      .refine((val) => !isNullish(val), {
        message: "This field is required",
      });

    // Guard the count refines against nullish input so empty submissions show
    // only the single "required" error instead of stacking with the count rule.
    if (minMetrics > 0) {
      fieldSchema = fieldSchema.refine(
        (val: unknown) => isNullish(val) || (Array.isArray(val) && val.length >= minMetrics),
        {
          message: `Please add at least ${minMetrics} ${pluralize("metric", minMetrics)}`,
        }
      );
    }

    if (maxMetrics !== Number.POSITIVE_INFINITY) {
      fieldSchema = fieldSchema.refine(
        (val: unknown) => isNullish(val) || (Array.isArray(val) && val.length <= maxMetrics),
        {
          message: `Maximum ${maxMetrics} ${pluralize("metric", maxMetrics)} allowed`,
        }
      );
    }

    return fieldSchema;
  }

  // Optional field: build the array schema once, layering on any limits.
  let arrSchema = z.array(metricSchema);

  if (minMetrics > 0) {
    arrSchema = arrSchema.min(
      minMetrics,
      `Please add at least ${minMetrics} ${pluralize("metric", minMetrics)}`
    );
  }

  if (maxMetrics !== Number.POSITIVE_INFINITY) {
    arrSchema = arrSchema.max(
      maxMetrics,
      `Maximum ${maxMetrics} ${pluralize("metric", maxMetrics)} allowed`
    );
  }

  return z.union([arrSchema, z.undefined(), z.null()]);
}
