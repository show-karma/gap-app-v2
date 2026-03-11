import fetchData from "@/utilities/fetchData";

interface GranteeEmail {
  email: string;
  projectName: string;
  referenceNumber?: string;
}

interface SendEmailParams {
  programId: string;
  recipients: string[];
  subject: string;
  body: string;
}

interface SendEmailResponse {
  success: boolean;
  sentCount: number;
  failedCount: number;
}

export async function getGranteeEmails(
  programId: string,
  statuses?: string[]
): Promise<GranteeEmail[]> {
  let url = `/v2/email-grantees/program/${programId}/emails`;
  if (statuses && statuses.length > 0) {
    url += `?status=${statuses.join(",")}`;
  }
  const [data, error] = await fetchData<{ emails: GranteeEmail[] }>(url);
  if (error) throw new Error(error);
  if (!data || !Array.isArray(data.emails)) {
    throw new Error("Invalid response: expected emails array");
  }
  return data.emails;
}

export async function sendEmailToGrantees(params: SendEmailParams): Promise<SendEmailResponse> {
  const [data, error] = await fetchData<SendEmailResponse>("/v2/email-grantees/send", "POST", {
    programId: params.programId,
    recipients: params.recipients,
    subject: params.subject,
    body: params.body,
  });
  if (error) throw new Error(error);
  if (!data) throw new Error("No response data received");
  return data;
}

export type { GranteeEmail, SendEmailParams, SendEmailResponse };
