import { z } from "zod";
import { requiredString } from "@/utilities/validation/zod-primitives";

/**
 * Base schema fields shared between create and update program forms.
 * Used by both admin (CreateProgramModal, ProgramDetailsTab) and public (AddProgram) schemas.
 */
export const baseProgramFields = {
  name: requiredString("Program name", {
    min: 3,
    max: 50,
    messages: {
      required: "Program name is required",
      min: "Program name must be at least 3 characters",
      max: "Program name must be at most 50 characters",
    },
  }),
  description: requiredString("Description", {
    min: 3,
    messages: { min: "Description must be at least 3 characters" },
  }),
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
  budget: z
    .union([z.literal(""), z.string(), z.number(), z.null(), z.undefined()])
    .transform((val) => (val === "" || val === null || val === undefined ? undefined : Number(val)))
    .pipe(z.number().min(0, { message: "Budget must be a positive number" }).optional()),
  invoiceRequired: z.boolean({ error: "Please select whether invoices are required" }),
};

/**
 * Build a required email array field with min(1) constraint.
 */
export const requiredEmailArray = (label: string) =>
  z
    .array(z.string().email({ message: "Invalid email address" }))
    .min(1, { message: `At least one ${label} email is required` });
