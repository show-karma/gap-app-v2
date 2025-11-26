import { z } from "zod";

export const settingsConfigSchema = z.object({
  privateApplications: z.boolean(),
  applicationDeadline: z.string().optional(),
  donationRound: z.boolean(),
  successPageContent: z.string().optional(),
  showCommentsOnPublicPage: z.boolean(),
});

export type SettingsConfigFormData = z.infer<typeof settingsConfigSchema>;
