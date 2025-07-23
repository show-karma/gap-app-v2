import type { MetadataRoute } from "next";
import { chosenCommunities } from "@/utilities/chosenCommunities";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	return chosenCommunities().map((community) => ({
		url: `https://gap.karmahq.xyz/${community.slug || community.uid}`,
		lastModified: new Date().toISOString(),
		changeFrequency: "hourly",
		priority: 1,
	}));
}
