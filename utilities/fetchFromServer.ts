import { Method } from "axios";

export async function fetchFromLocalApi<T>(
  endpoint: string,
  method: Method = "GET",
  body?: any,
  headers?: Record<string, string>
): Promise<T> {
  const url = `http://localhost:3000/api${endpoint}`;

  const options: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  };

  if (body && (method === "POST" || method === "PUT" || method === "PATCH")) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: T = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching from local API:", error);
    throw error;
  }
}
