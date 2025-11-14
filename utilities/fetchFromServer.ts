import type { Method } from "axios"

export async function fetchFromLocalApi<T>(
  endpoint: string,
  method: Method = "GET",
  body?: any,
  _headers?: Record<string, string>
): Promise<T> {
  const url = `${process.env.VERCEL_URL}/api${endpoint}`

  const options: RequestInit = {
    method,
    // headers: {
    //   "Content-Type": "application/json",
    //   ...headers,
    // },
  }

  if (body && (method === "POST" || method === "PUT" || method === "PATCH")) {
    options.body = JSON.stringify(body)
  }

  try {
    const response = await fetch(url, options)

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error("Error fetching from local API:", error)
    throw error
  }
}
