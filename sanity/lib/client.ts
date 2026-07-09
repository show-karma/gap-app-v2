import { createClient } from "next-sanity";

import { apiVersion, dataset, projectId } from "@/sanity/env";

/**
 * Shared Sanity client for reading published content.
 *
 * `projectId` may be an empty string when Sanity is not configured (e.g.
 * local dev, CI). The client itself does not throw on an empty projectId —
 * callers (the content gateway, `sanity/lib/gateway.ts`) are responsible
 * for short-circuiting before issuing a query so the app never crashes on
 * a missing CMS configuration.
 */
export const client = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: true,
  perspective: "published",
});
