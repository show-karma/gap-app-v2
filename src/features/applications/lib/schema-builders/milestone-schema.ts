import { z } from "zod";
import type { ApplicationQuestion } from "@/types/whitelabel-entities";

const dateStringSchema = z.string().refine(
  (val) => {
    const parsed = Date.parse(val);
    return !Number.isNaN(parsed);
  },
  { message: "Invalid date format" }
);

const milestoneSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  dueDate: z.union([dateStringSchema, z.date()]),
  fundingRequested: z.string().optional(),
  completionCriteria: z.string().optional(),
});

export function buildMilestoneSchema(q: ApplicationQuestion) {
  const minMilestones = q.validation?.minMilestones || (q.required ? 1 : 0);
  const maxMilestones = q.validation?.maxMilestones || Number.POSITIVE_INFINITY;

  if (q.required) {
    let fieldSchema: z.ZodTypeAny = z
      .union([z.array(milestoneSchema), z.undefined(), z.null()])
      .refine((val) => val !== undefined && val !== null, {
        message: "This field is required",
      });

    if (minMilestones > 0) {
      fieldSchema = fieldSchema.refine(
        (val: unknown) => Array.isArray(val) && val.length >= minMilestones,
        {
          message: `Please add at least ${minMilestones} milestone${minMilestones > 1 ? "s" : ""}`,
        }
      );
    }

    if (maxMilestones !== Number.POSITIVE_INFINITY) {
      fieldSchema = fieldSchema.refine(
        (val: unknown) => Array.isArray(val) && val.length <= maxMilestones,
        {
          message: `Maximum ${maxMilestones} milestone${maxMilestones > 1 ? "s" : ""} allowed`,
        }
      );
    }

    return fieldSchema;
  }

  if (minMilestones > 0 || maxMilestones !== Number.POSITIVE_INFINITY) {
    let arrSchema = z.array(milestoneSchema);

    if (minMilestones > 0) {
      arrSchema = arrSchema.min(
        minMilestones,
        `Please add at least ${minMilestones} milestone${minMilestones > 1 ? "s" : ""}`
      );
    }

    if (maxMilestones !== Number.POSITIVE_INFINITY) {
      arrSchema = arrSchema.max(
        maxMilestones,
        `Maximum ${maxMilestones} milestone${maxMilestones > 1 ? "s" : ""} allowed`
      );
    }

    return z.union([arrSchema, z.undefined(), z.null()]);
  }

  return z.union([z.array(milestoneSchema), z.undefined(), z.null()]);
}
