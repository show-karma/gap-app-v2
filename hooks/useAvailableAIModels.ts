import { useQuery } from "@tanstack/react-query";
import { createAuthenticatedApiClient } from "@/utilities/auth/api-client";
import { envVars } from "@/utilities/enviromentVars";
import { QUERY_KEYS } from "@/utilities/queryKeys";

const API_ENDPOINT = "/v2/settings/available-ai-models";

const apiClient = createAuthenticatedApiClient(envVars.NEXT_PUBLIC_GAP_INDEXER_URL, 30000);

export type AIModelSelection = "programPrompt" | "portfolioReport";

interface AvailableAIModelsPayload {
  models?: string[];
  selections?: Partial<Record<AIModelSelection, string[]>>;
}

interface ApiResponse {
  data?: AvailableAIModelsPayload;
  models?: AvailableAIModelsPayload["models"];
  selections?: AvailableAIModelsPayload["selections"];
}

/**
 * Extracts a selection-specific model list from wrapped and direct responses.
 * The all-model list remains a rollout fallback for older backend responses.
 */
export function extractModelsFromResponse(
  response: ApiResponse,
  selection: AIModelSelection
): string[] | null {
  const payload = response.data ?? response;
  const selectedModels = payload.selections?.[selection];

  if (Array.isArray(selectedModels)) {
    return selectedModels;
  }

  if (Array.isArray(payload.models)) {
    return payload.models;
  }

  return null;
}

async function fetchAvailableAIModels(selection: AIModelSelection): Promise<string[]> {
  const response = await apiClient.get<ApiResponse>(API_ENDPOINT);
  return extractModelsFromResponse(response.data, selection) ?? [];
}

/**
 * Hook to fetch available AI models from backend settings
 * @returns Query result with models array, loading state, and error state
 */
export function useAvailableAIModels(selection: AIModelSelection = "programPrompt") {
  return useQuery({
    queryKey: [...QUERY_KEYS.SETTINGS.AVAILABLE_AI_MODELS, selection],
    queryFn: () => fetchAvailableAIModels(selection),
    staleTime: 1000 * 60 * 60, // 1 hour - models don't change frequently
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
    retry: 2,
    // Only refetch on mount if data is stale or missing
    refetchOnMount: true,
  });
}
