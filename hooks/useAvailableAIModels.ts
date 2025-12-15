import { useQuery } from "@tanstack/react-query";
import { createAuthenticatedApiClient } from "@/utilities/auth/api-client";
import { envVars } from "@/utilities/enviromentVars";
import { QUERY_KEYS } from "@/utilities/queryKeys";

const DEFAULT_MODELS = ["gpt-5.2"] as const;
const API_ENDPOINT = "/v2/settings/available-ai-models";

const apiClient = createAuthenticatedApiClient(envVars.NEXT_PUBLIC_GAP_INDEXER_URL, 30000);

interface ApiResponse {
  data?: {
    models?: string[];
  };
  models?: string[];
}

/**
 * Extracts models array from API response
 * Handles both wrapped { data: { models: [...] } } and direct { models: [...] } responses
 */
function extractModelsFromResponse(response: ApiResponse): string[] | null {
  // Wrapped response: { data: { models: [...] } }
  if (response.data?.models && Array.isArray(response.data.models)) {
    return response.data.models;
  }

  // Direct response: { models: [...] }
  if (Array.isArray(response.models)) {
    return response.models;
  }

  return null;
}

async function fetchAvailableAIModels(): Promise<string[]> {
  try {
    const response = await apiClient.get<ApiResponse>(API_ENDPOINT);
    const models = extractModelsFromResponse(response.data);

    if (models && models.length > 0) {
      return models;
    }

    // Fallback to default if no valid models found
    return [...DEFAULT_MODELS];
  } catch (error) {
    // Log error in development only
    if (process.env.NODE_ENV === "development") {
      console.error("Error fetching available AI models:", error);
    }
    // Fallback to default on error
    return [...DEFAULT_MODELS];
  }
}

/**
 * Hook to fetch available AI models from backend settings
 * @returns Query result with models array, loading state, and error state
 */
export function useAvailableAIModels() {
  return useQuery({
    queryKey: QUERY_KEYS.SETTINGS.AVAILABLE_AI_MODELS,
    queryFn: fetchAvailableAIModels,
    staleTime: 1000 * 60 * 60, // 1 hour - models don't change frequently
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
    retry: 2,
    // Only refetch on mount if data is stale or missing
    refetchOnMount: true,
  });
}
