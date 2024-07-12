import { ISitemapField, getServerSideSitemap } from "next-sitemap";
import { chosenCommunities } from "@/utilities/chosenCommunities";
import { gapIndexerApi } from "@/utilities/gapIndexerApi";
import { Hex } from "viem";

export async function GET(request: Request) {
  const communities = chosenCommunities().map((community) => community.uid);
  const fetchProjects = await Promise.all(
    communities.map(async (communityID) => {
      const community = await gapIndexerApi
        .grantsByCommunity(communityID as Hex)
        .then((res) => res)
        .catch(() => undefined);
      if (!community) return;
      const communityData = (community as any)?.data?.data;
      if (!communityData || !communityData?.length) return;
      const projects = communityData.map(
        (grant: any) =>
          grant.project?.slug ||
          grant.project?.uid ||
          grant.project?.data?.slug ||
          grant.project?.data?.uid ||
          grant.project?.details?.data?.slug ||
          grant.project?.details?.data?.uid
      );
      if (!projects) return;
      return projects;
    })
  );

  const filteredProjects = fetchProjects.flatMap((project) => project);

  const fields: ISitemapField[] = filteredProjects.map((path) => ({
    loc: `https://gap.karmahq.xyz/project/${path}`,
    lastmod: new Date().toISOString(),
    changefreq: "daily",
    priority: 0.7,
  }));

  return getServerSideSitemap(fields);
}
