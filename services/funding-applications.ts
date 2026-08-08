import type { UserApplicationsResponse } from "@/src/features/user-applications/types";
import type { IFundingApplication } from "@/types/funding-platform";
import { api } from "@/utilities/api/client";
import { HttpError } from "@/utilities/api/errors";
import { createAuthenticatedApiClient } from "@/utilities/auth/api-client";
import { envVars } from "@/utilities/enviromentVars";
import { INDEXER } from "@/utilities/indexer";

const API_URL = envVars.NEXT_PUBLIC_GAP_INDEXER_URL;
// Keep apiClient for delete operations
const apiClient = createAuthenticatedApiClient(API_URL, 30000);

/**
 * Extracts the same human-readable error message the legacy `fetchData`
 * adapter surfaced for an `HttpError`: prefer the server response body's
 * `message`, then the original axios error's message, then the client's
 * synthetic message. Falls back to a plain `Error.message` (or
 * `String(error)`) for non-HTTP `ApiError`s.
 */
function httpErrorMessage(error: unknown): string {
  if (error instanceof HttpError) {
    const bodyMessage = (error.body as { message?: string } | undefined)?.message;
    const causeMessage = (error.cause as { message?: string } | undefined)?.message;
    return bodyMessage || causeMessage || error.message;
  }
  return error instanceof Error ? error.message : String(error);
}

export async function fetchApplicationByProjectUID(
  projectUID: string
): Promise<IFundingApplication | null> {
  try {
    // TODO(#1775): add zod schema
    const data = await api.get<IFundingApplication>(
      INDEXER.V2.APPLICATIONS.BY_PROJECT_UID(projectUID)
    );
    return data || null;
  } catch (error) {
    // 404 (no application found) degrades to null instead of throwing.
    if (error instanceof HttpError && error.status === 404) {
      return null;
    }
    throw new Error(httpErrorMessage(error));
  }
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
  let data: UserApplicationsResponse | null;
  try {
    // TODO(#1775): add zod schema
    data = await api.get<UserApplicationsResponse>(
      INDEXER.V2.FUNDING_APPLICATIONS.MY_APPLICATIONS(params)
    );
  } catch (error) {
    throw new Error(httpErrorMessage(error));
  }

  if (!data) {
    throw new Error("Empty response from my-applications");
  }

  return data;
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
