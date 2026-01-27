import axios, { type AxiosInstance } from "axios";
import { envVars } from "../enviromentVars";
import { TokenManager } from "./token-manager";

/**
 * Creates an authenticated axios instance for API calls
 * This function creates an axios instance with an interceptor that
 * automatically adds the auth token from the store to requests
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
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  return apiClient;
}
