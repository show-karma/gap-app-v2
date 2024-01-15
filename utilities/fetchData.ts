import axios, { Method } from "axios";

export default async function fetchData(
  endpoint: string,
  method: Method = "GET",
  axiosData = {}
) {
  try {
    const res = await axios.request({
      url: `${process.env.NEXT_PUBLIC_API_ROUTE}${endpoint}`,
      method,
      headers: {},
      data: axiosData,
      timeout: 60000,
    });
    let resData = res.data.data;
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
