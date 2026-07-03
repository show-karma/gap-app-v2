import type { UserApplicationsResponse } from "@/src/features/user-applications/types";
import type { IFundingApplication } from "@/types/funding-platform";
import { createAuthenticatedApiClient } from "@/utilities/auth/api-client";
import { envVars } from "@/utilities/enviromentVars";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";

const API_URL = envVars.NEXT_PUBLIC_GAP_INDEXER_URL;
// Keep apiClient for delete operations
const apiClient = createAuthenticatedApiClient(API_URL, 30000);

export async function fetchApplicationByProjectUID(
  projectUID: string
): Promise<IFundingApplication | null> {
  const [data, error] = await fetchData<IFundingApplication>(
    INDEXER.V2.APPLICATIONS.BY_PROJECT_UID(projectUID)
  );

  if (error) {
    // Return null for 404 (no application found)
    const errorMessage = String(error);
    if (errorMessage.includes("404") || errorMessage.includes("not found")) {
      return null;
    }
    throw new Error(errorMessage);
  }

  return data || null;
}

/**
 * Fetch the authenticated user's own funding applications, scoped to a community
 * (and optionally a program). Used to detect whether a denied user is an
 * applicant for the program/community in context.
 */
export async function fetchUserApplications(params: {
  communitySlug: string;
  programId?: string;
  page?: number;
  limit?: number;
}): Promise<UserApplicationsResponse> {
  const [data, error] = await fetchData<UserApplicationsResponse>(
    INDEXER.V2.FUNDING_APPLICATIONS.MY_APPLICATIONS(params)
  );

  if (error || !data) {
    throw new Error(String(error ?? "Empty response from my-applications"));
  }

  return data;
}

export async function deleteApplication(referenceNumber: string): Promise<void> {
  try {
    await apiClient.delete(INDEXER.V2.APPLICATIONS.DELETE(referenceNumber));
  } catch (error) {
    const axiosError = error as {
      message?: string;
      response?: { status?: number; statusText?: string; data?: { message?: string } };
    };
    // Log error with context before re-throwing for hook to handle
    console.error("Service layer: Failed to delete application", {
      referenceNumber,
      status: axiosError?.response?.status,
      statusText: axiosError?.response?.statusText,
      errorMessage: axiosError?.response?.data?.message || axiosError?.message,
      timestamp: new Date().toISOString(),
    });
    throw error;
  }
}
