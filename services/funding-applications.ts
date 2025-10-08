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
