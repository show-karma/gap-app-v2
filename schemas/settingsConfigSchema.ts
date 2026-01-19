import { z } from "zod";

export const settingsConfigSchema = z.object({
  privateApplications: z.boolean(),
  donationRound: z.boolean(),
  successPageContent: z.string().optional(),
  showCommentsOnPublicPage: z.boolean(),
  approvalEmailTemplate: z.string().optional(),
  approvalEmailSubject: z.string().optional(),
  rejectionEmailTemplate: z.string().optional(),
  rejectionEmailSubject: z.string().optional(),
  accessCode: z
    .string()
    .optional()
    .refine((code) => !code || code.length >= 6, {
      message: "Access code must be at least 6 characters",
    })
    .refine((code) => !code || code.length <= 50, {
      message: "Access code must be at most 50 characters",
    })
    .refine((code) => !code || !/\s/.test(code), {
      message: "Access code cannot contain spaces",
    }),
});

export type SettingsConfigFormData = z.infer<typeof settingsConfigSchema>;
