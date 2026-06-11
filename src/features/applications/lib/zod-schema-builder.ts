import { type ZodType, z } from "zod";
import type { ApplicationQuestion } from "@/types/whitelabel-entities";
import { evaluateVisibleFields } from "@/utilities/form-visibility/evaluate-field-visibility";
import { buildFileSchema } from "./schema-builders/file-schema";
import {
  buildDefaultSchema,
  buildKarmaProfileLinkSchema,
} from "./schema-builders/karma-profile-schema";
import { buildMilestoneSchema } from "./schema-builders/milestone-schema";
import { buildDateSchema, buildNumberSchema } from "./schema-builders/number-schema";
import { buildMultiselectSchema, buildSelectSchema } from "./schema-builders/select-schema";
import { buildEmailSchema, buildTextSchema, buildUrlSchema } from "./schema-builders/text-schema";

const schemaBuilders: Record<string, (q: ApplicationQuestion) => ZodType> = {
  text: buildTextSchema,
  textarea: buildTextSchema,
  email: buildEmailSchema,
  url: buildUrlSchema,
  number: buildNumberSchema,
  date: buildDateSchema,
  select: buildSelectSchema,
  radio: buildSelectSchema,
  multiselect: buildMultiselectSchema,
  checkbox: buildMultiselectSchema,
  file: buildFileSchema,
  milestone: buildMilestoneSchema,
  karma_profile_link: buildKarmaProfileLinkSchema,
};

/**
 * Builds the zod schema for the application form.
 *
 * When `currentValues` is provided, conditionally hidden questions are
 * excluded from the shape entirely: they are never validated (a hidden
 * required field cannot block submission) and — because z.object strips
 * unknown keys — their stale values are excluded from the parsed output.
 */
export function buildDynamicSchema(
  questions: ApplicationQuestion[],
  currentValues?: Record<string, unknown>
) {
  const shape: Record<string, ZodType> = {};

  const visibleIds = currentValues
    ? evaluateVisibleFields(questions, (field) => currentValues[field.id])
    : null;

  for (const q of questions) {
    if (q.type === "section_header") continue;
    if (visibleIds && !visibleIds.has(q.id)) continue;
    const builder = schemaBuilders[q.type] ?? buildDefaultSchema;
    shape[q.id] = builder(q);
  }

  return z.object(shape);
}

export type InferSchemaType<T extends ApplicationQuestion[]> = z.infer<
  ReturnType<typeof buildDynamicSchema>
>;
