import { z } from "zod";
import { baseProgramFields, requiredEmailArray } from "./base";

/**
 * Email fields for admin program forms (create and update).
 * Both admin and finance emails are required.
 */
const adminEmailFields = {
  adminEmails: requiredEmailArray("admin"),
  financeEmails: requiredEmailArray("finance"),
};

/**
 * Schema for creating new programs (admin flow).
 * Admin emails are REQUIRED (bug fix: was previously optional).
 */
export const createProgramSchema = z.object({
  ...baseProgramFields,
  ...adminEmailFields,
});

/**
 * Schema for updating existing programs (admin flow).
 * Both email fields are required.
 */
export const updateProgramSchema = z.object({
  ...baseProgramFields,
  ...adminEmailFields,
});

export type CreateProgramFormSchema = z.infer<typeof createProgramSchema>;
export type UpdateProgramFormSchema = z.infer<typeof updateProgramSchema>;

/** Unified type alias — create and update schemas share the same shape. */
export type AdminProgramFormSchema = CreateProgramFormSchema;
