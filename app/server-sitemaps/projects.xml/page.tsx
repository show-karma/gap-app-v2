import {
  ISitemapField,
  getServerSideSitemap,
  getServerSideSitemapLegacy,
} from "next-sitemap";
import { chosenCommunities } from "@/utilities/chosenCommunities";
import { envVars } from "@/utilities/enviromentVars";

export async function GET(request: Request) {
  const communities = chosenCommunities().map((community) => community.uid);
  const fetchCommunities = await Promise.all(
    communities.map((communityID) => {
      return fetch(
        `${envVars.NEXT_PUBLIC_GAP_INDEXER_URL}/communities/${communityID}/grants`
      );
    })
  );

  const communitiesResponse = await Promise.all(
    fetchCommunities.map(async (res) => res.json())
  );
  const paths = communitiesResponse.flatMap((community) => {
    return community.map((grant: any) => ({
      projectId: grant.project.slug || grant.project.uid,
    }));
  });

  const fields: ISitemapField[] = paths.map((path) => ({
    loc: `https://gap.karmahq.xyz/project/${path.projectId}`,
    lastmod: new Date().toISOString(),
    changefreq: "daily",
    priority: 0.7,
  }));

  return getServerSideSitemap(paths);
}
