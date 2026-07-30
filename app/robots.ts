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
      {
        userAgent: "GPTBot",
        allow: ["/", "/.well-known/", "/llms.txt", "/llms-full.txt", "/agents.md"],
        disallow: ["/api/", "/admin/", "/super-admin/", "/safe/", "/extended-sitemap.xml"],
      },
      {
        userAgent: "ChatGPT-User",
        allow: ["/", "/.well-known/", "/llms.txt", "/llms-full.txt", "/agents.md"],
        disallow: ["/api/", "/admin/", "/super-admin/", "/safe/", "/extended-sitemap.xml"],
      },
      {
        userAgent: "ClaudeBot",
        allow: ["/", "/.well-known/", "/llms.txt", "/llms-full.txt", "/agents.md"],
        disallow: ["/api/", "/admin/", "/super-admin/", "/safe/", "/extended-sitemap.xml"],
      },
      {
        userAgent: "PerplexityBot",
        allow: ["/", "/.well-known/", "/llms.txt", "/llms-full.txt", "/agents.md"],
        disallow: ["/api/", "/admin/", "/super-admin/", "/safe/", "/extended-sitemap.xml"],
      },
      {
        userAgent: "Google-Extended",
        allow: ["/", "/.well-known/", "/llms.txt", "/llms-full.txt", "/agents.md"],
        disallow: ["/api/", "/admin/", "/super-admin/", "/safe/", "/extended-sitemap.xml"],
      },
      // Training-only crawlers: no answer-engine value, full disallow.
      {
        userAgent: "CCBot",
        disallow: ["/"],
      },
      {
        userAgent: "Bytespider",
        disallow: ["/"],
      },
    ],
    // Only the fresh index URL is advertised: Google's stored sitemap state is
    // keyed per URL, and the old /sitemap.xml + /sitemap-index.xml entries are
    // stuck on a degraded May 2026 parse (see app/sitemap_index.xml/route.ts).
    // Both old URLs keep serving; they're just no longer advertised.
    sitemap: [`${SITE_URL}/sitemap_index.xml`],
    host: SITE_URL,
  };
}
