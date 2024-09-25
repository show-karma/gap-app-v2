import { chosenCommunities } from "@/utilities/chosenCommunities";
import { MetadataRoute } from "next";
import axios from "axios";



export async function generateSitemaps() {
  // Fetch all communities
  const response = await axios.get("https://gapapi.karmahq.xyz/communities")
  const communities = response.data
    .filter((community: any) => community?.details?.data?.slug !== undefined)
    .map((_: any, index: number) => ({
      id: index
    }));

  return communities as { id: number }[]
}

export default async function sitemap(
  { id }: { id: number }
): Promise<MetadataRoute.Sitemap> {
  const response = await axios.get("https://gapapi.karmahq.xyz/communities")
  const communities = response.data
    .filter((community: any) => community?.details?.data?.slug !== undefined)
    .map((_: any, i: number) => ({
      id: i,
      slug: _?.details?.data?.slug
    }));

  const community = communities[id].slug;


  if (community) {
    console.log("Fetching sitemaps for community", community, id);
    const response = await axios.get(`https://gapapi.karmahq.xyz/communities/${community}/sitemaps`);
    const sitemaps = response.data;

    let sitemap: MetadataRoute.Sitemap = [
      ...sitemaps.projects.map((url: string) => ({
        url,
        lastModified: new Date().toISOString(),
        changeFrequency: "daily",
        priority: 1,
      })),
      ...sitemaps.impacts.map((url: string) => ({
        url,
        lastModified: new Date().toISOString(),
        changeFrequency: "daily",
        priority: 1,
      })),
      ...sitemaps.grants.map((url: string) => ({
        url,
        lastModified: new Date().toISOString(),
        changeFrequency: "daily",
        priority: 1,
      })),
      ...sitemaps.milestonesAndUpdates.map((url: string) => ({
        url,
        lastModified: new Date().toISOString(),
        changeFrequency: "daily",
        priority: 1,
      }))
    ];

    console.log("Totally ", sitemap.length, " URLs generated on sitemap");

    return sitemap;
  } else {
    return [];
  }
}
