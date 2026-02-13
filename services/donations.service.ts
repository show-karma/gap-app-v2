import axios from "axios";
import type {
  CreateDonationRequest,
  DonationApiResponse,
  DonationStatusApiResponse,
  OnrampSessionRequest,
  OnrampSessionResponse,
} from "@/hooks/donation/types";
import { createAuthenticatedApiClient } from "@/utilities/auth/api-client";
import { envVars } from "@/utilities/enviromentVars";

const API_URL = envVars.NEXT_PUBLIC_GAP_INDEXER_URL;

const apiClient = createAuthenticatedApiClient(API_URL, 30000);

const publicApiClient = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

export const donationsService = {
  async getMyDonations(): Promise<DonationApiResponse[]> {
    const response = await apiClient.get<DonationApiResponse[]>("/v2/donations/me");
    return response.data;
  },

  async createDonation(request: CreateDonationRequest): Promise<DonationApiResponse> {
    const response = await apiClient.post<DonationApiResponse>("/v2/donations", request);
    return response.data;
  },

  async getDonationByUid(uid: string, chainId: number): Promise<DonationApiResponse> {
    const response = await apiClient.get<DonationApiResponse>(
      `/v2/donations/${encodeURIComponent(uid)}/${chainId}`
    );
    return response.data;
  },

  async createOnrampSession(request: OnrampSessionRequest): Promise<OnrampSessionResponse> {
    const response = await apiClient.post<OnrampSessionResponse>("/v2/onramp/session", request);
    return response.data;
  },

  async getDonationStatus(
    uid: string,
    chainId: number,
    pollingToken: string
  ): Promise<DonationStatusApiResponse> {
    const response = await publicApiClient.get<DonationStatusApiResponse>(
      `/v2/donations/${encodeURIComponent(uid)}/${chainId}/status`,
      { headers: { "X-Polling-Token": pollingToken } }
    );
    return response.data;
  },
};
