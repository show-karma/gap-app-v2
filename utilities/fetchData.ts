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
  isAuthorized = true,
  noCache: boolean | undefined = true
) {
  try {
    const cookies = new Cookies();
    const token = cookies.get(authCookiePath);

    const sanitizedData = sanitizeObject(axiosData);
    const res = await axios.request({
      url:
        `${envVars.NEXT_PUBLIC_GAP_INDEXER_URL}${endpoint}` +
        (noCache ? `${endpoint.includes("?") ? "&" : "?"}noCache=true` : ""),
      method,
      headers: {
        Authorization: isAuthorized ? token || undefined : undefined,
        ...headers,
      },
      data: sanitizedData,
      timeout: 360000,
      params,
    });
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
