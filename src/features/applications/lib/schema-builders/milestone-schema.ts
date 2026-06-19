import { z } from "zod";
import type { ApplicationQuestion } from "@/types/whitelabel-entities";
import { optionalString, requiredString } from "@/utilities/validation/zod-primitives";

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

/**
 * Sub-field shape for a single milestone row in the public applicant flow.
 *
 * Required-ness is declared ONCE here using the shared `requiredString` /
 * `optionalString` primitives, and the UI (`MilestoneItem`) derives its
 * asterisks/`isRequired` indicators from `MILESTONE_ITEM_FIELD_REQUIRED` below
 * so the schema and the visual indicator can never disagree.
 *
 * Issue #1179: `description` is `optionalString()` — an applicant can submit a
 * milestone without a description. This matches PR #1174's product intent and
 * the FundingPlatform admin/edit path (see
 * `components/FundingPlatform/ApplicationView/lib/repeatable-item-schemas.ts`).
 *
 * Note: `dueDate` keeps its bespoke future-date union here (the FundingPlatform
 * path validates dates differently), so this object is composed locally rather
 * than imported wholesale from the FundingPlatform schema.
 */
const milestoneSchema = z.object({
  title: requiredString("Title", { messages: { required: "Title is required" } }),
  description: optionalString(),
  dueDate: z.union([futureDateSchema, z.date()]),
  fundingRequested: requiredString("Milestone funding requested", {
    messages: { required: "Milestone funding requested is required" },
  }),
  completionCriteria: requiredString("Completion criteria", {
    messages: { required: "Completion criteria is required" },
  }),
});

/**
 * Single source of truth for which milestone sub-fields are required in the
 * public applicant flow. Derived from `milestoneSchema` so the UI indicator and
 * the validation rule are guaranteed to stay in sync.
 */
export const MILESTONE_ITEM_FIELD_REQUIRED: Record<keyof z.infer<typeof milestoneSchema>, boolean> =
  {
    title: !milestoneSchema.shape.title.isOptional(),
    description: !milestoneSchema.shape.description.isOptional(),
    dueDate: !milestoneSchema.shape.dueDate.isOptional(),
    fundingRequested: !milestoneSchema.shape.fundingRequested.isOptional(),
    completionCriteria: !milestoneSchema.shape.completionCriteria.isOptional(),
  };

export function buildMilestoneSchema(q: ApplicationQuestion) {
  const minMilestones = q.validation?.minMilestones || (q.required ? 1 : 0);
  const maxMilestones = q.validation?.maxMilestones || Number.POSITIVE_INFINITY;

  if (q.required) {
    let fieldSchema: z.ZodType = z
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
