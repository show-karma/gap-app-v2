import axios, { type AxiosInstance } from "axios";
import { envVars } from "../enviromentVars";
import { TokenManager } from "./token-manager";

/**
 * Creates an authenticated axios instance for API calls
 * This function creates an axios instance with interceptors that:
 * 1. Automatically adds the auth token to requests
 * 2. Handles 401 responses by refreshing the token and retrying once
 */
export function createAuthenticatedApiClient(
  baseURL: string = envVars.NEXT_PUBLIC_GAP_INDEXER_URL,
  timeout = 30000
): AxiosInstance {
  const apiClient = axios.create({
    baseURL,
    timeout,
    headers: {
      "Content-Type": "application/json",
    },
  });

  // Add request interceptor for authentication
  apiClient.interceptors.request.use(async (config) => {
    // Get auth token from store
    const token = await TokenManager.getToken();
    if (token) {
      // Ensure Bearer prefix is present for standard HTTP authorization
      config.headers.Authorization = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
    }
    return config;
  });

  // Add response interceptor for 401 token refresh
  apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;

      // Only attempt refresh once per request to avoid infinite loops
      if (error.response?.status === 401 && originalRequest && !originalRequest._retried) {
        originalRequest._retried = true;

        // Clear cached token so next getToken() fetches a fresh one
        TokenManager.clearCache();

        const freshToken = await TokenManager.getToken();
        if (freshToken) {
          originalRequest.headers.Authorization = freshToken.startsWith("Bearer ")
            ? freshToken
            : `Bearer ${freshToken}`;
          return apiClient.request(originalRequest);
        }
      }

      return Promise.reject(error);
    }
  );

  return apiClient;
}
