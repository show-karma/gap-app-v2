import { z } from "zod";
import { api } from "@/utilities/api/client";

const GranteeEmailSchema = z.object({
  email: z.string(),
  projectName: z.string(),
  referenceNumber: z.string().optional(),
});
type GranteeEmail = z.infer<typeof GranteeEmailSchema>;

const GranteeEmailsResponseSchema = z.object({
  emails: z.array(GranteeEmailSchema),
});

interface SendEmailParams {
  programId: string;
  recipients: string[];
  subject: string;
  body: string;
}

const SendEmailResponseSchema = z.object({
  success: z.boolean(),
  sentCount: z.number(),
  failedCount: z.number(),
});
type SendEmailResponse = z.infer<typeof SendEmailResponseSchema>;

export async function getGranteeEmails(
  programId: string,
  statuses?: string[]
): Promise<GranteeEmail[]> {
  let url = `/v2/email-grantees/program/${programId}/emails`;
  if (statuses && statuses.length > 0) {
    url += `?status=${statuses.join(",")}`;
  }
  const data = await api.get(url, { schema: GranteeEmailsResponseSchema });
  return data.emails;
}

export async function sendEmailToGrantees(params: SendEmailParams): Promise<SendEmailResponse> {
  return api.post(
    "/v2/email-grantees/send",
    {
      programId: params.programId,
      recipients: params.recipients,
      subject: params.subject,
      body: params.body,
    },
    { schema: SendEmailResponseSchema }
  );
}

export type { GranteeEmail, SendEmailParams, SendEmailResponse };
