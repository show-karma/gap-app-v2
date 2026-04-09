import type { MetadataRoute } from "next";
import { chosenCommunities } from "@/utilities/chosenCommunities";

const communitySubPages = ["funding-opportunities", "impact", "updates"] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date().toISOString();

  return chosenCommunities().flatMap((community) => {
    const identifier = community.slug || community.uid;

    const rootEntry: MetadataRoute.Sitemap[number] = {
      url: `https://www.karmahq.xyz/community/${identifier}`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    };

    const subPageEntries: MetadataRoute.Sitemap = communitySubPages.map((subPage) => ({
      url: `https://www.karmahq.xyz/community/${identifier}/${subPage}`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.7,
    }));

    return [rootEntry, ...subPageEntries];
  });
}
