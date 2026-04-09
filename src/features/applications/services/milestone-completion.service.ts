import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";

export interface MilestoneCompletion {
  id: string;
  milestoneFieldLabel: string;
  milestoneTitle: string;
  completionText: string;
  isVerified: boolean;
  verifiedBy?: string;
  verificationComment?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MilestoneCompletionPayload {
  milestoneFieldLabel: string;
  milestoneTitle: string;
  completionText: string;
}

const BASE_URL = "/v2/funding-applications";

export async function getMilestoneCompletions(
  referenceNumber: string
): Promise<MilestoneCompletion[]> {
  const [response, fetchError] = await fetchData<
    MilestoneCompletion[] | { data: MilestoneCompletion[] }
  >(`${BASE_URL}/${referenceNumber}/milestone-completions`);
  if (fetchError) throw new Error(fetchError);
  if (!response) return [];
  return Array.isArray(response) ? response : (response.data ?? []);
}

export async function createMilestoneCompletion(
  referenceNumber: string,
  payload: MilestoneCompletionPayload
): Promise<MilestoneCompletion> {
  const [response, fetchError] = await fetchData<MilestoneCompletion>(
    `${BASE_URL}/${referenceNumber}/milestone-completions`,
    "POST",
    payload
  );
  if (fetchError || !response)
    throw new Error(fetchError ?? "Failed to create milestone completion");
  return response;
}

export async function updateMilestoneCompletion(
  referenceNumber: string,
  payload: MilestoneCompletionPayload
): Promise<MilestoneCompletion> {
  const [response, fetchError] = await fetchData<MilestoneCompletion>(
    `${BASE_URL}/${referenceNumber}/milestone-completions`,
    "PUT",
    payload
  );
  if (fetchError || !response)
    throw new Error(fetchError ?? "Failed to update milestone completion");
  return response;
}

export interface MilestoneInvoiceSummary {
  milestoneLabel: string;
  invoiceStatus: string;
  invoiceFileKey: string | null;
}

export interface ApplicationInvoiceConfig {
  grantUID: string;
  invoiceRequired: boolean;
  milestoneInvoices: MilestoneInvoiceSummary[];
}

export async function getApplicationInvoiceConfig(
  referenceNumber: string
): Promise<ApplicationInvoiceConfig | null> {
  try {
    const [data, error] = await fetchData<{ data: ApplicationInvoiceConfig }>(
      INDEXER.V2.FUNDING_APPLICATIONS.INVOICE_CONFIG(referenceNumber),
      "GET",
      {},
      {},
      {},
      true,
      false
    );
    if (error || !data?.data) return null;
    return data.data;
  } catch {
    return null;
  }
}
