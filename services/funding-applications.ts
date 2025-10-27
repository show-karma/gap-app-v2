import { INDEXER } from "@/utilities/indexer";
import { envVars } from "@/utilities/enviromentVars";
import { createAuthenticatedApiClient } from "@/utilities/auth/api-client";
import type { IFundingApplication } from "@/types/funding-platform";

const API_URL = envVars.NEXT_PUBLIC_GAP_INDEXER_URL;
const apiClient = createAuthenticatedApiClient(API_URL, 30000);

export async function fetchApplicationByProjectUID(
  projectUID: string
): Promise<IFundingApplication | null> {
  try {
    const response = await apiClient.get<IFundingApplication>(
      INDEXER.V2.APPLICATIONS.BY_PROJECT_UID(projectUID)
    );
    return response.data;
  } catch (error: any) {
    if (error.response?.status === 404) {
      return null;
    }
    throw error;
  }
}

export async function deleteApplication(
  referenceNumber: string
): Promise<void> {
  try {
    await apiClient.delete(INDEXER.V2.APPLICATIONS.DELETE(referenceNumber));
  } catch (error: any) {
    // Log error with context before re-throwing for hook to handle
    console.error('Service layer: Failed to delete application', {
      referenceNumber,
      status: error?.response?.status,
      statusText: error?.response?.statusText,
      errorMessage: error?.response?.data?.message || error?.message,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
}
