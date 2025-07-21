import { chosenCommunities } from "@/features/communities/lib/chosenCommunities";
import { MetadataRoute } from "next";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return chosenCommunities().map((community) => ({
    url: `https://gap.karmahq.xyz/${community.slug || community.uid}`,
    lastModified: new Date().toISOString(),
    changeFrequency: "hourly",
    priority: 1,
  }));
}
