import { createClient } from "next-sanity";

import { apiVersion, dataset, projectId } from "@/sanity/env";

/**
 * Shared Sanity client for reading published content.
 *
 * `projectId` may be an empty string when Sanity is not configured (e.g.
 * local dev, CI). `createClient` throws synchronously at construction time
 * if `projectId` is falsy, so we fall back to a syntactically valid
 * placeholder id here to keep this module importable in that case. Callers
 * (the content gateway, `sanity/lib/gateway.ts`) are responsible for
 * short-circuiting on the real (unfallback'd) `projectId` before issuing
 * any query, so the app never actually queries Sanity with the placeholder.
 */
export const client = createClient({
  projectId: projectId || "placeholder",
  dataset,
  apiVersion,
  useCdn: true,
  perspective: "published",
});
