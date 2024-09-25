import { chosenCommunities } from "@/utilities/chosenCommunities";
import { MetadataRoute } from "next";
import axios from "axios";



export async function generateSitemaps() {
  return [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }]
}

export default async function sitemap(
  { id }: { id: number }
): Promise<MetadataRoute.Sitemap> {
  const response = await axios.get("https://gapapi.karmahq.xyz/communities")
  const communities = response.data
    .filter((community: any) => community?.details?.data?.slug !== undefined)
    .map((_: any) => ({
      slug: _?.details?.data?.slug
    }));

  let final: MetadataRoute.Sitemap = []

  for (const { slug: community } of communities) {
    if (community !== undefined) {
      console.log("Fetching sitemaps for community", community, id);
      const response = await axios.get(`https://gapapi.karmahq.xyz/communities/${community}/sitemaps`);
      const sitemaps = response.data;

      let sitemap: MetadataRoute.Sitemap = [];
      switch (id) {
        case 1:
          sitemap = sitemaps.projects ? sitemaps.projects.map((url: string) => ({
            url,
            lastModified: new Date().toISOString(),
            changeFrequency: "daily",
            priority: 1,
          })) : [];
          break;
        case 2:
          sitemap = sitemaps.impacts ? sitemaps.impacts.map((url: string) => ({
            url,
            lastModified: new Date().toISOString(),
            changeFrequency: "daily",
            priority: 1,
          })) : [];
          break;
        case 3:
          sitemap = sitemaps.grants ? sitemaps.grants.map((url: string) => ({
            url,
            lastModified: new Date().toISOString(),
            changeFrequency: "daily",
            priority: 1,
          })) : [];
          break;
        case 4:
          sitemap = sitemaps.milestonesAndUpdates ? sitemaps.milestonesAndUpdates.map((url: string) => ({
            url,
            lastModified: new Date().toISOString(),
            changeFrequency: "daily",
            priority: 1,
          })) : [];
          break;
        default:
          sitemap = [];
      }

      final.push(...sitemap);
    }
    console.log("Totally ", final.length, " URLs generated on sitemap");
  }

  return final;
}
