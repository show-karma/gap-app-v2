import toast from "react-hot-toast";
import { getGrantInvoiceDownloadUrl } from "@/src/features/payout-disbursement/services/payout-disbursement.service";

/** Opens a grant milestone's invoice in a new tab via a pre-signed URL. */
export const openGrantInvoice = async (
  grantUID: string | undefined,
  fileKey: string | null | undefined
): Promise<void> => {
  if (!grantUID || !fileKey) return;
  try {
    const url = await getGrantInvoiceDownloadUrl(grantUID, fileKey);
    window.open(url, "_blank", "noopener,noreferrer");
  } catch {
    // SUPPRESSED: user gets a toast; a failed pre-signed invoice URL fetch
    // (expired fileKey, network) is user-recoverable and not Sentry-worthy.
    toast.error("Failed to open invoice");
  }
};
