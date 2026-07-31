import type { MetadataRoute } from "next";
import { chosenCommunities } from "@/utilities/chosenCommunities";
import { FINANCIALS_ENABLED_COMMUNITIES } from "@/utilities/community-flags";
import { SITE_URL } from "@/utilities/meta";

// Sub-pages every chosen community exposes. Each one serves a self-referential
// canonical and its own title/description — a URL only earns a sitemap entry
// when it is the canonical of distinct, crawlable content.
//
// `browse-applications` is deliberately absent: it is a fully client-rendered
// application-search tool with no server-rendered content and no unique
// metadata, so it has nothing for a crawler to index. It still serves 200 and
// consolidates onto the community root canonical — it is just not submitted.
const COMMUNITY_SUB_PAGES = [
  "funding-opportunities",
  "projects",
  "updates",
  "impact",
  "reports",
] as const;

// `lastModified` is intentionally omitted — we have no accurate per-page
// modified date, and a fabricated "now" makes Google distrust the signal
// (see utilities/sitemap.ts buildUrlsetXml).
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return chosenCommunities().flatMap((community) => {
    const identifier = community.slug || community.uid;

    const rootEntry: MetadataRoute.Sitemap[number] = {
      url: `${SITE_URL}/community/${identifier}`,
      changeFrequency: "daily",
      priority: 0.9,
    };

    // Financials is behind a per-community flag; everywhere else the route
    // renders an explicit "not available" state, and submitting those would
    // list a near-identical thin page per community.
    const subPages: string[] = FINANCIALS_ENABLED_COMMUNITIES.includes(identifier)
      ? [...COMMUNITY_SUB_PAGES, "financials"]
      : [...COMMUNITY_SUB_PAGES];

    const subPageEntries: MetadataRoute.Sitemap = subPages.map((subPage) => ({
      url: `${SITE_URL}/community/${identifier}/${subPage}`,
      changeFrequency: "daily" as const,
      priority: 0.7,
    }));

    return [rootEntry, ...subPageEntries];
  });
}
