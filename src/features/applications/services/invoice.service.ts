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
 * Fetches invoice configuration for a grant application
 */
export async function getApplicationInvoiceConfig(
  referenceNumber: string
): Promise<ApplicationInvoiceConfig | null> {
  try {
    const response = (await fetchData(
      INDEXER.V2.FUNDING_APPLICATIONS.INVOICE_CONFIG(referenceNumber),
      "GET"
    )) as unknown;

    if (Array.isArray(response)) {
      const [, grantUID, , ,] = response;
      if (typeof grantUID === "string") {
        return { grantUID, invoiceRequired: false, milestoneInvoices: [] };
      }
      return null;
    }

    if (response && typeof response === "object" && "grantUID" in response) {
      return response as ApplicationInvoiceConfig;
    }

    return null;
  } catch (error) {
    console.error("Failed to fetch application invoice config:", error);
    return null;
  }
}
