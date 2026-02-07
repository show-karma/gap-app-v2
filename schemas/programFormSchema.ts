import { z } from "zod";

/**
 * Base schema fields shared between create and update
 */
const baseProgramFields = {
  name: z
    .string()
    .min(3, { message: "Program name must be at least 3 characters" })
    .max(50, { message: "Program name must be at most 50 characters" }),
  description: z.string().min(3, { message: "Description is required" }),
  shortDescription: z
    .string()
    .max(100, { message: "Short description must be at most 100 characters" })
    .min(1, { message: "Short description is required" }),
  dates: z
    .object({
      endsAt: z.date().optional(),
      startsAt: z.date().optional(),
    })
    .refine(
      (data) => {
        if (!data.endsAt || !data.startsAt) return true;
        return data.startsAt <= data.endsAt;
      },
      {
        message: "Start date must be before the end date",
        path: ["startsAt"],
      }
    ),
  budget: z.coerce.number().min(0, { message: "Budget must be a positive number" }).optional(),
};

/**
 * Email fields shared between create and update schemas.
 * Both adminEmails and financeEmails are required for all programs.
 * Old programs without emails must add them when updating.
 */
const emailFields = {
  adminEmails: z
    .array(z.string().email({ message: "Invalid email address" }))
    .min(1, { message: "At least one admin email is required" }),
  financeEmails: z
    .array(z.string().email({ message: "Invalid email address" }))
    .min(1, { message: "At least one finance email is required" }),
};

/**
 * Schema for creating new programs
 */
export const createProgramSchema = z.object({
  ...baseProgramFields,
  ...emailFields,
});

/**
 * Schema for updating existing programs
 * Both email fields are required - old programs must add them on update.
 * Used in ProgramDetailsTab (question-builder)
 */
export const updateProgramSchema = z.object({
  ...baseProgramFields,
  ...emailFields,
});

export type CreateProgramFormSchema = z.infer<typeof createProgramSchema>;
export type UpdateProgramFormSchema = z.infer<typeof updateProgramSchema>;
