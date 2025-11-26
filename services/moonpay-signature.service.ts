import { createAuthenticatedApiClient } from "@/utilities/auth/api-client";

interface SignMoonPayUrlResponse {
  signature: string;
}

const API_URL = process.env.NEXT_PUBLIC_GAP_INDEXER_URL;
const apiClient = createAuthenticatedApiClient(API_URL, 30000);

export const signMoonPayUrl = async (url: string): Promise<string> => {
  const response = await apiClient.post<
    { url: string },
    { data: SignMoonPayUrlResponse }
  >(`/v2/onramp/moonpay/sign`, { url });

  return response.data.signature;
};
