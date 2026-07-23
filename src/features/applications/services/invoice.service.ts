import { api } from "@/utilities/api/client";
import { INDEXER } from "@/utilities/indexer";

export type MilestoneInvoice = {
  // Present once the invoice was anchored to an on-chain milestone;
  // null/undefined for legacy off-chain rows that only carried a label.
  // MilestonesTab prefers UID matching to avoid same-title collisions.
  milestoneUID?: string | null;
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
 * We accept both wrapped (`{ data: ... }`) and unwrapped payload shapes for
 * resilience against indexer envelope changes. Any failure (network, auth,
 * 4xx/5xx) degrades to `null` rather than surfacing a React Query error —
 * the invoice UI simply doesn't render, matching the historical fetchData
 * behavior of this call site.
 */
export async function getApplicationInvoiceConfig(
  referenceNumber: string
): Promise<ApplicationInvoiceConfig | null> {
  // TODO(#1775): add zod schema
  const data = await api
    .get<ApplicationInvoiceConfig | { data: ApplicationInvoiceConfig }>(
      INDEXER.V2.FUNDING_APPLICATIONS.INVOICE_CONFIG(referenceNumber)
    )
    .catch(() => null);

  if (!data) return null;

  const config =
    typeof data === "object" && data !== null && "data" in data
      ? (data as { data: ApplicationInvoiceConfig }).data
      : (data as ApplicationInvoiceConfig);

  if (!config?.grantUID) return null;
  return config;
}
