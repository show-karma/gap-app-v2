import { z } from "zod";
import type { ApplicationQuestion } from "@/types/whitelabel-entities";

const MAX_YEAR = new Date().getFullYear() + 10;

const dateStringSchema = z.string().refine(
  (val) => {
    const match = val.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (!match) return false;

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);

    if (month < 1 || month > 12) return false;
    if (day < 1 || day > 31) return false;
    if (year > MAX_YEAR) return false;

    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  },
  { message: "Invalid date format" }
);

function getStartOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

const futureDateSchema = dateStringSchema.refine(
  (val) => {
    const parsed = new Date(`${val}T00:00:00`);
    return parsed >= getStartOfToday();
  },
  { message: "Due date must be today or in the future" }
);

const milestoneSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  dueDate: z.union([futureDateSchema, z.date()]),
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
