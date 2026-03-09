import { z } from "zod";

/**
 * Base schema fields shared between create and update program forms.
 * Used by both admin (CreateProgramModal, ProgramDetailsTab) and public (AddProgram) schemas.
 */
export const baseProgramFields = {
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
  invoiceRequired: z.boolean({ required_error: "Please select whether invoices are required" }),
};

/**
 * Build a required email array field with min(1) constraint.
 */
export const requiredEmailArray = (label: string) =>
  z
    .array(z.string().email({ message: "Invalid email address" }))
    .min(1, { message: `At least one ${label} email is required` });
