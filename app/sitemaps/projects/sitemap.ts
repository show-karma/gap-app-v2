import { chosenCommunities } from "@/utilities/chosenCommunities";
import { MetadataRoute } from "next";
import axios from "axios";



export async function generateSitemaps() {
  return [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }]
}

export default async function sitemap(
  { id }: { id: number }
): Promise<MetadataRoute.Sitemap> {

  let final: MetadataRoute.Sitemap = []

  console.log("Fetching sitemaps: ", id);
  
  try {
    const response = await axios.get(`https://gapapi.karmahq.xyz/projects/sitemap`, {
      timeout: 10000
    });
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
  } catch (error) {
    console.warn(`Failed to fetch sitemap data for ID ${id}:`, error instanceof Error ? error.message : error);
    console.warn("Returning empty sitemap as fallback");
    final = [];
  }

  console.log("Totally ", final.length, " URLs generated on sitemap");

  return final;
}
