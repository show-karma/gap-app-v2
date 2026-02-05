import type {
  CreateDonationRequest,
  DonationApiResponse,
  OnrampSessionRequest,
  OnrampSessionResponse,
} from "@/hooks/donation/types";
import { createAuthenticatedApiClient } from "@/utilities/auth/api-client";
import { envVars } from "@/utilities/enviromentVars";

const API_URL = envVars.NEXT_PUBLIC_GAP_INDEXER_URL;

const apiClient = createAuthenticatedApiClient(API_URL, 30000);

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("Donation API Error:", error.response?.data || error.message);
    throw error;
  }
);

export const donationsService = {
  async getUserDonations(walletAddress: string): Promise<DonationApiResponse[]> {
    const response = await apiClient.get<DonationApiResponse[]>(
      `/v2/donations/user/${walletAddress}`
    );
    return response.data;
  },

  async getProjectDonations(projectUID: string): Promise<DonationApiResponse[]> {
    const response = await apiClient.get<DonationApiResponse[]>(
      `/v2/donations/project/${projectUID}`
    );
    return response.data;
  },

  async createDonation(request: CreateDonationRequest): Promise<DonationApiResponse> {
    const response = await apiClient.post<DonationApiResponse>("/v2/donations", request);
    return response.data;
  },

  async createOnrampSession(request: OnrampSessionRequest): Promise<OnrampSessionResponse> {
    const response = await apiClient.post<OnrampSessionResponse>("/v2/onramp/session", request);
    return response.data;
  },
};
