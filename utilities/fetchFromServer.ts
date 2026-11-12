import type { Method } from "axios";
import { platformDeploymentOrigin } from "@/utilities/deployment-env";
import { appOrigin } from "@/utilities/domains";

/**
 * Where this app's own `/api` routes live, from the server's point of view.
 *
 * On Vercel that is the deployment's own hostname (`VERCEL_URL`), so a
 * preview calls its own API rather than staging's. Anywhere the platform
 * publishes no such hostname it is the app's canonical origin.
 */
export function localApiBaseUrl(): string {
  return `${platformDeploymentOrigin() ?? appOrigin()}/api`;
}

export async function fetchFromLocalApi<T>(
  endpoint: string,
  method: Method = "GET",
  body?: unknown,
  _headers?: Record<string, string>
): Promise<T> {
  const url = `${localApiBaseUrl()}${endpoint}`;

  const options: RequestInit = {
    method,
    // headers: {
    //   "Content-Type": "application/json",
    //   ...headers,
    // },
  };

  if (body && (method === "POST" || method === "PUT" || method === "PATCH")) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching from local API:", error);
    throw error;
  }
}
