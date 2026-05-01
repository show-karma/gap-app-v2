import { z } from "zod";
import {
  EVALUATION_CRITERIA_MAX,
  type EvaluationStyle,
  evaluationStyleSchema,
  PROGRAM_DESCRIPTION_MAX,
} from "./session.schema";

export const TEMPLATE_NAME_MAX = 120;
export const FEEDBACK_INSTRUCTION_MAX = 1_000;
export const FEEDBACK_INSTRUCTIONS_MAX_ITEMS = 50;

export const templateCreateSchema = z.object({
  name: z
    .string()
    .min(2, "Template name must be at least 2 characters")
    .max(TEMPLATE_NAME_MAX, `Template name must be at most ${TEMPLATE_NAME_MAX} characters`),
  programDescription: z
    .string()
    .min(20, "Describe your program in at least 20 characters")
    .max(PROGRAM_DESCRIPTION_MAX),
  evaluationCriteria: z
    .string()
    .min(20, "Describe your evaluation criteria in at least 20 characters")
    .max(EVALUATION_CRITERIA_MAX),
  evaluationStyle: evaluationStyleSchema,
  feedbackInstructions: z
    .array(z.string().max(FEEDBACK_INSTRUCTION_MAX))
    .max(FEEDBACK_INSTRUCTIONS_MAX_ITEMS)
    .default([]),
});
export type TemplateCreateInput = z.infer<typeof templateCreateSchema>;

export interface TemplateResponse {
  id: string;
  userId: string;
  name: string;
  programDescription: string;
  evaluationCriteria: string;
  evaluationStyle: EvaluationStyle;
  feedbackInstructions: string[];
  createdAt: string;
  updatedAt: string;
}

export interface BuiltInTemplate {
  id: string;
  name: string;
  description: string;
  programDescription: string;
  evaluationCriteria: string;
  evaluationStyle: EvaluationStyle;
  feedbackInstructions: string[];
}
