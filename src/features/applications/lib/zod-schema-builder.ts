import { type ZodTypeAny, z } from "zod";
import type { ApplicationQuestion } from "@/types/whitelabel-entities";
import { buildFileSchema } from "./schema-builders/file-schema";
import {
  buildDefaultSchema,
  buildKarmaProfileLinkSchema,
} from "./schema-builders/karma-profile-schema";
import { buildMilestoneSchema } from "./schema-builders/milestone-schema";
import { buildDateSchema, buildNumberSchema } from "./schema-builders/number-schema";
import { buildMultiselectSchema, buildSelectSchema } from "./schema-builders/select-schema";
import { buildEmailSchema, buildTextSchema, buildUrlSchema } from "./schema-builders/text-schema";

const schemaBuilders: Record<string, (q: ApplicationQuestion) => ZodTypeAny> = {
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

export function buildDynamicSchema(questions: ApplicationQuestion[]) {
  const shape: Record<string, ZodTypeAny> = {};

  for (const q of questions) {
    if (q.type === "section_header") continue;
    const builder = schemaBuilders[q.type] ?? buildDefaultSchema;
    shape[q.id] = builder(q);
  }

  return z.object(shape);
}

export type InferSchemaType<T extends ApplicationQuestion[]> = z.infer<
  ReturnType<typeof buildDynamicSchema>
>;
