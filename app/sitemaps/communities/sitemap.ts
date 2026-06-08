import type { MetadataRoute } from "next";
import { chosenCommunities } from "@/utilities/chosenCommunities";

const communitySubPages = [
  "funding-opportunities",
  "browse-applications",
  "projects",
  "updates",
  "impact",
  "financials",
  "reports",
] as const;

// `lastModified` is intentionally omitted — we have no accurate per-page
// modified date, and a fabricated "now" makes Google distrust the signal
// (see utilities/sitemap.ts buildUrlsetXml).
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return chosenCommunities().flatMap((community) => {
    const identifier = community.slug || community.uid;

    const rootEntry: MetadataRoute.Sitemap[number] = {
      url: `https://www.karmahq.xyz/community/${identifier}`,
      changeFrequency: "daily",
      priority: 0.9,
    };

    const subPageEntries: MetadataRoute.Sitemap = communitySubPages.map((subPage) => ({
      url: `https://www.karmahq.xyz/community/${identifier}/${subPage}`,
      changeFrequency: "daily" as const,
      priority: 0.7,
    }));

    return [rootEntry, ...subPageEntries];
  });
}
