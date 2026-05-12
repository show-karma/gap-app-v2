import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";

export type MilestoneInvoice = {
  milestoneLabel: string;
  invoiceFileKey: string | null;
  invoiceRequired: boolean;
};

export type ApplicationInvoiceConfig = {
  grantUID: string;
  invoiceRequired: boolean;
  milestoneInvoices: MilestoneInvoice[];
};

/**
 * Fetches invoice configuration for a grant application.
 *
 * `fetchData` returns `[data, error, pageInfo, status]` (see
 * utilities/fetchData.ts). The earlier code skipped position 0 (the
 * actual payload) and read position 1 (the error string), so the
 * happy path silently returned `null` and the invoice UI never
 * appeared. We accept both wrapped (`{ data: ... }`) and unwrapped
 * payload shapes for resilience against indexer envelope changes.
 */
export async function getApplicationInvoiceConfig(
  referenceNumber: string
): Promise<ApplicationInvoiceConfig | null> {
  const [data, error] = await fetchData<
    ApplicationInvoiceConfig | { data: ApplicationInvoiceConfig }
  >(INDEXER.V2.FUNDING_APPLICATIONS.INVOICE_CONFIG(referenceNumber), "GET");

  if (error || !data) return null;

  const config =
    typeof data === "object" && data !== null && "data" in data
      ? (data as { data: ApplicationInvoiceConfig }).data
      : (data as ApplicationInvoiceConfig);

  if (!config?.grantUID) return null;
  return config;
}
