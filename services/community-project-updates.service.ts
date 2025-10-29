import { envVars } from "@/utilities/enviromentVars";
import { INDEXER } from "@/utilities/indexer";
import { errorManager } from "@/components/Utilities/errorManager";
import type { CommunityUpdatesResponse } from "@/types/community-updates";

const API_URL = envVars.NEXT_PUBLIC_GAP_INDEXER_URL;

export interface FetchCommunityProjectUpdatesParams {
  communityId: string;
  page?: number;
  limit?: number;
  status?: "all" | "pending" | "completed";
}

export async function fetchCommunityProjectUpdates(
  params: FetchCommunityProjectUpdatesParams
): Promise<CommunityUpdatesResponse> {
  const { communityId, page = 1, limit = 25, status = "all" } = params;

  try {
    const searchParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (status !== "all") {
      searchParams.append("status", status);
    }

    const url = `${API_URL}${INDEXER.COMMUNITY.PROJECT_UPDATES(
      communityId
    )}?${searchParams.toString()}`;

    const response = await fetch(url);

    if (!response.ok) {
      const errorText = await response
        .text()
        .catch(() => "Unable to read error response");
      const error = new Error(
        `Failed to fetch community updates: ${response.status} ${response.statusText}`
      );

      errorManager("Community project updates fetch failed", error, {
        communityId,
        page,
        limit,
        status,
        statusCode: response.status,
        statusText: response.statusText,
        errorBody: errorText,
      });

      throw error;
    }

    // Validate content-type before parsing JSON
    const contentType = response.headers.get("content-type");
    if (!contentType?.includes("application/json")) {
      const error = new Error("Server returned non-JSON response");
      errorManager("Invalid content-type from community updates endpoint", error, {
        communityId,
        contentType,
        url,
      });
      throw error;
    }

    return await response.json();
  } catch (error) {
    // Handle JSON parsing errors specifically
    if (error instanceof SyntaxError) {
      const jsonError = new Error("Server returned invalid JSON");
      errorManager("JSON parsing failed for community project updates", jsonError, {
        communityId,
        page,
        status,
        originalError: error.message,
      });
      throw jsonError;
    }

    // Re-throw if already handled above
    if (
      error instanceof Error &&
      error.message.includes("Failed to fetch community updates")
    ) {
      throw error;
    }

    // Log unexpected errors
    errorManager("Unexpected error fetching community project updates", error, {
      communityId,
      page,
      limit,
      status,
    });

    throw error;
  }
}
