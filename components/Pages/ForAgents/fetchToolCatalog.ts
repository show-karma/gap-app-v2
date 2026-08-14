import * as Sentry from "@sentry/nextjs";
import { getIndexerBaseUrl } from "@/utilities/wellKnown";
import { STATIC_FALLBACK_TOOLS } from "./content";
import type { PublicToolMetadata } from "./types";

const UPSTREAM_TIMEOUT_MS = 5000;
const REVALIDATE_SECONDS = 3600;

/**
 * Fetches the live MCP tool catalog from gap-indexer's `/mcp/tools`
 * discovery endpoint. Cached at the Next.js data layer for one hour so
 * the build never blocks on a slow indexer and cold renders are cheap.
 *
 * Resilience contract:
 *   - Times out after 5s via `AbortSignal.timeout`.
 *   - Treats non-2xx responses, network errors, and an empty `tools`
 *     array as failures — all paths return `STATIC_FALLBACK_TOOLS`.
 *   - Captures every failure to Sentry with the
 *     `for-agents/tool-catalog` component tag (matches the existing
 *     `mcp-tools.json/route.ts` pattern).
 *   - Uses the shared `getIndexerBaseUrl()` helper, so an unset/empty
 *     `NEXT_PUBLIC_GAP_INDEXER_URL` throws — caught here and falls back
 *     to `STATIC_FALLBACK_TOOLS`.
 *
 * Build-time behaviour: at `next build` there is no live indexer, so the
 * fetch fails fast, the fallback list ships, and the build still succeeds.
 * The first hot request after deploy revalidates the cache.
 */
export async function fetchToolCatalog(): Promise<PublicToolMetadata[]> {
  try {
    const res = await fetch(`${getIndexerBaseUrl()}/mcp/tools`, {
      next: { revalidate: REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });

    if (!res.ok) {
      throw new Error(`upstream ${res.status}`);
    }

    const data = (await res.json()) as { tools?: unknown };
    const tools = Array.isArray(data?.tools) ? (data.tools as PublicToolMetadata[]) : [];
    if (tools.length === 0) {
      throw new Error("upstream returned empty tools array");
    }
    return tools;
  } catch (err) {
    Sentry.captureException(err, {
      tags: { component: "for-agents/tool-catalog" },
    });
    return STATIC_FALLBACK_TOOLS;
  }
}
