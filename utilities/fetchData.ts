import axios, { Method } from "axios";
import { envVars } from "./enviromentVars";

export default async function fetchData(
  endpoint: string,
  method: Method = "GET",
  axiosData = {},
  params = {}
) {
  try {
    const res = await axios.request({
      url: `${envVars.NEXT_PUBLIC_GAP_INDEXER_URL}${endpoint}`,
      method,
      headers: {},
      data: axiosData,
      timeout: 60000,
      params,
    });
    let resData = res.data;
    let pageInfo = res.data.pageInfo || null;
    return [resData, null, pageInfo];
  } catch (err: any) {
    let error = "";
    if (!err.response) {
      error = "No server response";
    } else if (err.response.status >= 500) {
      error = "Internal server error";
    } else {
      error = err.response.data.message || err.message;
    }
    return [null, error];
  }
}
