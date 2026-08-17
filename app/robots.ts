import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { bareHostname, STAGING_HOST } from "@/utilities/domains";
import { SITE_URL } from "@/utilities/meta";
import { getWhitelabelByDomain } from "@/utilities/whitelabel-config";

const WILDCARD_ALLOW = ["/", "/.well-known/"];
const WILDCARD_DISALLOW = ["/api/", "/admin/", "/super-admin/", "/safe/", "/extended-sitemap.xml"];

// Search and user-fetch agents. Google-Extended, ChatGPT-User and PerplexityBot are
// deliberately absent: they already have their own groups below and their policy is
// training-related, not search-related.
const SEARCH_AND_USER_FETCH_BOTS = [
  "Googlebot",
  "Bingbot",
  "DuckDuckBot",
  "OAI-SearchBot",
  "Applebot",
];

// AI crawlers get the wildcard policy plus the agent-facing files, which are
// the surfaces written for them.
const AI_CRAWLER_ALLOW = [...WILDCARD_ALLOW, "/llms.txt", "/llms-full.txt", "/agents.md"];

const AI_CRAWLERS = [
  "GPTBot",
  "ChatGPT-User",
  "ClaudeBot",
  "PerplexityBot",
  "Google-Extended",
  "CCBot",
  "Bytespider",
];

/**
 * Host-aware, and therefore per-request rather than static.
 *
 * proxy.ts never sees this route — its matcher excludes any root path
 * containing a dot, so /robots.txt reaches the app on whatever host was
 * requested, including staging and every whitelabel tenant domain. A single
 * hardcoded body was being served to all of them.
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  // `host`, not `x-forwarded-host`: the forwarded header is client-settable, so
  // trusting it would let a request talk this route into the staging or tenant
  // branch. It is also what proxy.ts and getWhitelabelContext() read, and this
  // route must classify a host exactly the way they do.
  const headerList = await headers();
  const host = bareHostname(headerList.get("host") ?? "");

  // staging.karmahq.org is a new host created by the .org migration, so it
  // carries none of the "already ignored by crawlers" protection an old host
  // would. A cross-domain canonical is only a hint; this is the directive.
  if (host === STAGING_HOST) {
    return {
      rules: [{ userAgent: "*", disallow: "/" }],
    };
  }

  // On a tenant's own domain, `host:` would declare that domain a mirror of
  // www.karmahq.org, and the advertised sitemap contains zero tenant URLs
  // (canonicalizeSitemapUrl rewrites every entry to the canonical host).
  // Emit crawl rules only and let the per-page canonicals speak for the tenant.
  const isWhitelabelHost = getWhitelabelByDomain(host) !== null;

  return {
    rules: [
      {
        userAgent: "*",
        allow: WILDCARD_ALLOW,
        disallow: WILDCARD_DISALLOW,
      },
      // Search / user-fetch crawlers: pinned to the wildcard policy so AI-bot rule
      // changes can never silently alter what search engines are allowed to fetch.
      ...SEARCH_AND_USER_FETCH_BOTS.map((userAgent) => ({
        userAgent,
        allow: WILDCARD_ALLOW,
        disallow: WILDCARD_DISALLOW,
      })),
      ...AI_CRAWLERS.map((userAgent) => ({
        userAgent,
        allow: AI_CRAWLER_ALLOW,
        disallow: WILDCARD_DISALLOW,
      })),
    ],
    // Only the fresh index URL is advertised: Google's stored sitemap state is
    // keyed per URL, and the old /sitemap.xml + /sitemap-index.xml entries are
    // stuck on a degraded May 2026 parse (see app/sitemap_index.xml/route.ts).
    // Both old URLs keep serving; they're just no longer advertised.
    ...(isWhitelabelHost ? {} : { sitemap: [`${SITE_URL}/sitemap_index.xml`], host: SITE_URL }),
  };
}
