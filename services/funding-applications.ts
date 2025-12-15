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
    if (error.includes("404") || error.includes("not found")) {
      return null;
    }
    throw new Error(error);
  }

  return data || null;
}

export async function deleteApplication(referenceNumber: string): Promise<void> {
  try {
    await apiClient.delete(INDEXER.V2.APPLICATIONS.DELETE(referenceNumber));
  } catch (error: any) {
    // Log error with context before re-throwing for hook to handle
    console.error("Service layer: Failed to delete application", {
      referenceNumber,
      status: error?.response?.status,
      statusText: error?.response?.statusText,
      errorMessage: error?.response?.data?.message || error?.message,
      timestamp: new Date().toISOString(),
    });
    throw error;
  }
}
