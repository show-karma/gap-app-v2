import { SITE_URL } from "@/utilities/meta";
import robotsConfig from "@/utilities/robots-config";

export const dynamic = "force-static";
export const revalidate = 3600;

/**
 * Custom robots.txt route handler.
 *
 * Why a route handler instead of (or alongside) `app/robots.ts`: the
 * `MetadataRoute.Robots` shape doesn't carry a typed slot for the
 * `Schemamap:` directive used by NLWeb crawlers to discover the
 * schema feeds file. We re-use the typed rules from `app/robots.ts`
 * as the single source of truth (so existing unit tests still pin
 * the rule set), serialize them to the standard robots.txt grammar
 * here, and append the `Schemamap:` line manually.
 *
 * Next.js route handlers take precedence over metadata-file
 * conventions for the same URL, so this is what the production
 * server ships.
 */

type StringOrArray = string | string[] | undefined;

function asLines(prefix: string, value: StringOrArray): string[] {
  if (!value) return [];
  const values = Array.isArray(value) ? value : [value];
  return values.map((v) => `${prefix}: ${v}`);
}

function serialize(): string {
  const config = robotsConfig();
  const lines: string[] = [];

  const rules = Array.isArray(config.rules) ? config.rules : [config.rules];
  for (const rule of rules) {
    if (!rule) continue;
    lines.push(...asLines("User-agent", rule.userAgent as StringOrArray));
    lines.push(...asLines("Allow", rule.allow as StringOrArray));
    lines.push(...asLines("Disallow", rule.disallow as StringOrArray));
    if (typeof rule.crawlDelay === "number") {
      lines.push(`Crawl-delay: ${rule.crawlDelay}`);
    }
    lines.push("");
  }

  if (config.sitemap) {
    const sitemaps = Array.isArray(config.sitemap) ? config.sitemap : [config.sitemap];
    for (const sitemap of sitemaps) {
      lines.push(`Sitemap: ${sitemap}`);
    }
  }

  if (config.host) {
    lines.push(`Host: ${config.host}`);
  }

  // NLWeb Schema Feeds directive — pointer at /schema-map.xml so
  // schema-feed-aware crawlers can discover Karma's structured-data
  // catalogue without scraping the sitemap first.
  lines.push(`Schemamap: ${SITE_URL}/schema-map.xml`);

  return `${lines.join("\n")}\n`;
}

const HEADERS = {
  "Content-Type": "text/plain; charset=utf-8",
  "Cache-Control": "public, max-age=3600",
} as const;

export function GET() {
  return new Response(serialize(), { status: 200, headers: HEADERS });
}
