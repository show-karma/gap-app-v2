import { SITE_URL } from "@/utilities/meta";
import { WELL_KNOWN_PREFLIGHT_HEADERS } from "@/utilities/wellKnown";

export const dynamic = "force-static";
export const revalidate = 3600;

/**
 * Markdown rendering of the homepage at /index.md.
 *
 * Why this exists: some AEO crawlers (and a growing number of agent
 * clients) probe `/index.md` as an alternate, content-negotiated view
 * of the home page so they can ingest a flat, prose-friendly copy
 * without scraping marketing HTML and stripping React hydration noise.
 *
 * Content mirrors what /llms.txt's "Landing Pages" section says but
 * flatter — H1 + one-paragraph description + flat link list. We keep
 * it small and stable so the body is cheap to embed in retrieval
 * indices and never goes stale faster than the homepage itself.
 *
 * Served as `text/markdown; charset=utf-8` (per the IETF markdown
 * media type draft) with wide-open CORS. CORS matches /.well-known/*
 * — these are unauthenticated public-discovery surfaces.
 */

const MARKDOWN = `# Karma

Karma is a platform where ecosystems allocate funding, track milestones, and measure impact, while builders share progress, earn reputation, and get discovered for more opportunities. Karma supports Optimism, Arbitrum One, Polygon, Base, Celo, Scroll, Lisk, and Sei.

## Links

- Home: ${SITE_URL}/
- Projects: ${SITE_URL}/projects
- Communities: ${SITE_URL}/communities
- For funders: ${SITE_URL}/funders
- Funding Map: ${SITE_URL}/funding-map
- Knowledge Base: ${SITE_URL}/knowledge
- MCP setup guide: ${SITE_URL}/mcp/connect
- For AI agents: ${SITE_URL}/for-agents
- OpenAPI spec: ${SITE_URL}/openapi.json
- LLM-friendly site map: ${SITE_URL}/llms.txt

## Contact

info@karmahq.xyz
`;

const MARKDOWN_HEADERS = {
  "Content-Type": "text/markdown; charset=utf-8",
  "Cache-Control": "public, max-age=3600",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Max-Age": "86400",
} as const;

export function GET() {
  return new Response(MARKDOWN, {
    status: 200,
    headers: MARKDOWN_HEADERS,
  });
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: WELL_KNOWN_PREFLIGHT_HEADERS });
}
