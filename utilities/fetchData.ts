import axios, { Method } from "axios";
import { envVars } from "./enviromentVars";
import { sanitizeObject } from "./sanitize";
import { TokenManager } from "@/utilities/auth/token-manager";

/**
 * Fetch data utility that uses Privy's TokenManager for authentication
 *
 * This replaces the complex cookie-based token retrieval with
 * Privy's simplified token management.
 */
export default async function fetchData(
  endpoint: string,
  method: Method = "GET",
  axiosData = {},
  params = {},
  headers = {},
  isAuthorized = true,
  cache: boolean | undefined = false,
  baseUrl: string = envVars.NEXT_PUBLIC_GAP_INDEXER_URL
) {
  try {
    const sanitizedData = sanitizeObject(axiosData);
    const isIndexerUrl = baseUrl === envVars.NEXT_PUBLIC_GAP_INDEXER_URL;

    const requestConfig: any = {
      url: isIndexerUrl
        ? `${baseUrl}${endpoint}${
            cache ? `${endpoint.includes("?") ? "&" : "?"}cache=${cache}` : ""
          }`
        : `${baseUrl}${endpoint}`,
      method,
      data: sanitizedData,
      params,
      headers: {
        ...headers,
      },
    };

    // Add authorization header if needed
    if (isIndexerUrl && isAuthorized) {
      // Get token from TokenManager (which uses Privy)
      const token = await TokenManager.getToken();

      if (token) {
        requestConfig.headers.Authorization = `Bearer ${token}`;
      }

      requestConfig.timeout = 360000;
    }

    const res = await axios.request(requestConfig);
    let resData = res.data;
    let pageInfo = res.data.pageInfo || null;
    return [resData, null, pageInfo];
  } catch (err: any) {
    let error = "";
    if (!err.response) {
      error = err;
    } else {
      error = err.response.data.message || err.message;
    }
    return [null, error];
  }
}