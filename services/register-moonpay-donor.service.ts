import { envVars } from "@/utilities/enviromentVars";

interface RegisterDonorParams {
  moonpayTransactionId: string;
  donorAddress: string;
  projectUid: string;
}

/**
 * Pre-register donor address for a MoonPay transaction.
 * Called when transaction is created, before webhook arrives.
 * This is a workaround for MoonPay sandbox not returning externalCustomerId in webhooks.
 */
export async function registerMoonPayDonor(params: RegisterDonorParams): Promise<void> {
  const response = await fetch(
    `${envVars.NEXT_PUBLIC_GAP_INDEXER_URL}/v2/onramp/moonpay/register-donor`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params),
    }
  );

  if (!response.ok) {
    console.error("[MoonPay] Failed to register donor:", await response.text());
    // Don't throw - this is a best-effort operation
    // The donation can still be processed without the donor address
  }
}
