import { SITE_URL } from "@/utilities/meta";

export const dynamic = "force-static";
export const revalidate = 3600;

/**
 * NLWeb Schema Feeds map at /schema-map.xml.
 *
 * Best-effort implementation of the in-progress NLWeb Schema Feeds
 * spec (https://nlweb.github.io/schema-feeds/). The spec is short:
 * a `<schemaMap>` root element points at one or more `<feed>`
 * entries, each describing a machine-ingestible feed Karma publishes.
 *
 * We declare the sitemap, the apex llms.txt, the modular llms.txt
 * files, and the well-known catalog entries. Crawlers that don't
 * understand schema feeds fall back to the sitemap directly — this
 * file is additive, not load-bearing.
 *
 * Served as `application/xml` with wide-open CORS so cross-origin
 * fetchers (Ora, Profound, NLWeb-native agents) can read it.
 */

function buildBody(): string {
  const feeds: Array<{ url: string; type: string; description: string }> = [
    {
      url: `${SITE_URL}/sitemap.xml`,
      type: "application/xml",
      description: "Sitemap index for all public Karma pages.",
    },
    {
      url: `${SITE_URL}/llms.txt`,
      type: "text/plain",
      description: "LLM-friendly site overview with curated links and summaries.",
    },
    {
      url: `${SITE_URL}/llms-full.txt`,
      type: "text/plain",
      description: "Full inline content for all landing pages and knowledge-base articles.",
    },
    {
      url: `${SITE_URL}/docs/llms.txt`,
      type: "text/plain",
      description: "Documentation-scoped LLM index.",
    },
    {
      url: `${SITE_URL}/api/llms.txt`,
      type: "text/plain",
      description: "API and MCP-scoped LLM index.",
    },
    {
      url: `${SITE_URL}/developers/llms.txt`,
      type: "text/plain",
      description: "Developer entry-point LLM index.",
    },
    {
      url: `${SITE_URL}/openapi.json`,
      type: "application/json",
      description: "OpenAPI 3 specification for the Karma REST API.",
    },
    {
      url: `${SITE_URL}/.well-known/mcp-tools.json`,
      type: "application/json",
      description: "Live public MCP tool catalog.",
    },
    {
      url: `${SITE_URL}/.well-known/api-catalog`,
      type: "application/json",
      description: "RFC 9727 API catalog linkset.",
    },
  ];

  const feedEntries = feeds
    .map(
      (feed) =>
        `  <feed>\n    <url>${escapeXml(feed.url)}</url>\n    <type>${escapeXml(feed.type)}</type>\n    <description>${escapeXml(feed.description)}</description>\n  </feed>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<schemaMap xmlns="https://nlweb.github.io/schema-feeds/1.0">\n${feedEntries}\n</schemaMap>\n`;
}

function escapeXml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

const HEADERS = {
  "Content-Type": "application/xml; charset=utf-8",
  "Cache-Control": "public, max-age=3600",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Max-Age": "86400",
} as const;

export function GET() {
  return new Response(buildBody(), { status: 200, headers: HEADERS });
}

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Max-Age": "86400",
    },
  });
}
