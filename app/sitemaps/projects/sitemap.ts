import { chosenCommunities } from "@/utilities/chosenCommunities";
import { MetadataRoute } from "next";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const communities = chosenCommunities().map(
    (community) => community.slug || community.uid
  );
  const fetchProjects = await Promise.all(
    communities.map(async (communityID) => {
      console.log("Fetching projects for community", communityID);
      let raw: any[] = [];
      let page = 0;
      let totalPages = 1;
      const itemsPerPage = 100;
      while (page < totalPages) {
        console.log(
          "Fetching page",
          page,
          "of",
          totalPages,
          "for community",
          communityID
        );
        const community = await fetch(
          `https://gapapi.karmahq.xyz/communities/${communityID}/grants?pageLimit=${itemsPerPage}&page=${page}`
        ).then((res) => res.json());
        if (!community) return;
        totalPages = Math.ceil(community?.pageInfo?.totalItems / itemsPerPage);
        raw = raw.concat(community?.data);
        page++;
      }
      if (!raw.length) return;

      const projects = raw.map(
        (grant: any) =>
          grant.project?.details?.data?.uid ||
          grant.project?.details?.data?.slug ||
          grant.project?.data?.slug ||
          grant.project?.data?.uid ||
          grant.project?.slug ||
          grant.project?.uid
      );
      if (!projects) return;
      console.log("Projects for community", communityID, projects.length);
      return projects.filter(
        (project, index, self) => self.indexOf(project) === index
      );
    })
  ).catch((error) => console.log(error));

  return (fetchProjects as any[])
    .flatMap((project) => project)
    .map((project) => ({
      url: `https://gap.karmahq.xyz/project/${project}`,
      lastModified: new Date().toISOString(),
      changeFrequency: "daily",
      priority: 1,
    }));
}
