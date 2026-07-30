import type { MetadataRoute } from "next";
import { SITE_URL } from "@/utilities/meta";

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

export default function robots(): MetadataRoute.Robots {
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
    sitemap: [`${SITE_URL}/sitemap_index.xml`],
    host: SITE_URL,
  };
}
