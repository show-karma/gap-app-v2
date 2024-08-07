import axios, { Method } from "axios";

export async function fetchEASData(
  query: string,
  variables: any,
  networkSubgraphURL: string
) {
  try {
    const headers = {
      "Content-Type": "application/json",
    };
    const response = await axios.post(
      networkSubgraphURL,
      {
        query,
        variables,
      },
      { headers }
    );
    return { response: response, success: true };
  } catch (err) {
    return { response: null, success: false };
  }
}
