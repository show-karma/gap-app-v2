import { createAuthenticatedApiClient } from "@/utilities/auth/api-client";

interface SignMoonPayUrlResponse {
  signature: string;
}

const API_URL = process.env.NEXT_PUBLIC_GAP_INDEXER_URL;
const apiClient = createAuthenticatedApiClient(API_URL, 30000);

/**
 * Sign a MoonPay widget URL using the backend HMAC-SHA256 signing endpoint
 *
 * @description
 * MoonPay requires URLs to be signed with a secret key stored securely on the server.
 * This prevents URL tampering and ensures only authorized widgets can be initialized.
 *
 * @param url - The complete MoonPay URL with query parameters to be signed
 * @returns Promise resolving to the base64-encoded HMAC-SHA256 signature
 *
 * @throws {Error} If the URL is malformed, missing query parameters, or if the backend request fails
 *
 * @example
 * ```typescript
 * const moonpayUrl = "https://buy.moonpay.com?apiKey=pk_test_123&walletAddress=0x742d35Cc...";
 * const signature = await signMoonPayUrl(moonpayUrl);
 * const signedUrl = `${moonpayUrl}&signature=${encodeURIComponent(signature)}`;
 * ```
 */
export const signMoonPayUrl = async (url: string): Promise<string> => {
  const response = await apiClient.post<{ url: string }, { data: SignMoonPayUrlResponse }>(
    `/v2/onramp/moonpay/sign`,
    { url }
  );

  return response.data.signature;
};
