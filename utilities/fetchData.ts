import axios, { Method } from "axios";
import { envVars } from "./enviromentVars";
import { sanitizeObject } from "./sanitize";
import { getDynamicJwt } from "./auth/dynamicAuth";

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
    // Get Dynamic JWT auth token
    const dynamicToken = await getDynamicJwt();
    const authToken = dynamicToken || undefined;

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

    if (isIndexerUrl) {
      requestConfig.headers.Authorization = isAuthorized
        ? authToken || undefined
        : undefined;
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
