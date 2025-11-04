import { chosenCommunities } from "@/utilities/chosenCommunities";
import { MetadataRoute } from "next";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return chosenCommunities().map((community) => ({
    url: `https://karmahq.xyz/${community.slug || community.uid}`,
    lastModified: new Date().toISOString(),
    changeFrequency: "hourly",
    priority: 1,
  }));
}
