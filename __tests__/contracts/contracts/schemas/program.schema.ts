import { z } from "zod";

export const formFieldSchema = z.object({
  id: z.string(),
  type: z.enum([
    "text",
    "textarea",
    "number",
    "email",
    "url",
    "select",
    "checkbox",
    "radio",
    "date",
    "milestone",
    "karma_profile_link",
  ]),
  label: z.string(),
  placeholder: z.string().optional(),
  required: z.boolean().optional(),
  options: z.array(z.string()).optional(),
  validation: z
    .object({
      min: z.number().optional(),
      max: z.number().optional(),
      maxLength: z.number().optional(),
      pattern: z.string().optional(),
      message: z.string().optional(),
      maxMilestones: z.number().optional(),
      minMilestones: z.number().optional(),
    })
    .optional(),
  description: z.string().optional(),
});

export const formSchemaSchema = z.object({
  id: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  fields: z.array(formFieldSchema),
  settings: z
    .object({
      submitButtonText: z.string().optional(),
      confirmationMessage: z.string().optional(),
      privateApplications: z.boolean().optional(),
      donationRound: z.boolean().optional(),
      successPageContent: z.string().optional(),
      showCommentsOnPublicPage: z.boolean().optional(),
      approvalEmailTemplate: z.string().optional(),
      approvalEmailSubject: z.string().optional(),
      rejectionEmailTemplate: z.string().optional(),
      rejectionEmailSubject: z.string().optional(),
      accessCodeEnabled: z.boolean().optional(),
      accessCode: z.string().optional(),
      kycFormUrl: z.string().optional(),
      kybFormUrl: z.string().optional(),
    })
    .optional(),
});

export const fundingProgramConfigSchema = z.object({
  id: z.string(),
  programId: z.string(),
  chainID: z.number(),
  formSchema: formSchemaSchema,
  postApprovalFormSchema: formSchemaSchema.optional(),
  systemPrompt: z.string().optional(),
  detailedPrompt: z.string().optional(),
  aiModel: z.string().optional(),
  enableRealTimeEvaluation: z.boolean().optional(),
  evaluationConfig: z.record(z.string(), z.unknown()).optional(),
  isEnabled: z.boolean(),
  createdAt: z.union([z.string(), z.date()]),
  updatedAt: z.union([z.string(), z.date()]),
});
