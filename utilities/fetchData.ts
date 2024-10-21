import axios, { Method } from "axios";
import { envVars } from "./enviromentVars";
import Cookies from "universal-cookie";
import { authCookiePath } from "@/hooks/useAuth";
import { sanitizeObject } from "./sanitize";

export default async function fetchData(
  endpoint: string,
  method: Method = "GET",
  axiosData = {},
  params = {},
  headers = {},
  isAuthorized = false,
  noCache: boolean | undefined = true,
  baseUrl: string = envVars.NEXT_PUBLIC_GAP_INDEXER_URL
) {
  try {
    const cookies = new Cookies();
    const token = cookies.get(authCookiePath);

    const sanitizedData = sanitizeObject(axiosData);
    const isIndexerUrl = baseUrl === envVars.NEXT_PUBLIC_GAP_INDEXER_URL;

    const requestConfig: any = {
      url: isIndexerUrl
        ? `${baseUrl}${endpoint}${
            noCache ? `${endpoint.includes("?") ? "&" : "?"}noCache=true` : ""
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
        ? token || undefined
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
      error = "No server response";
    } else {
      error = err.response.data.message || err.message;
    }
    return [null, error];
  }
}
