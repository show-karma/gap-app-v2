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
        )
          .then((res) => res.json())
          .catch(() => {
            console.log("Error fetching projects for community", communityID);
            return undefined;
          });
        if (!community) return;
        totalPages = Math.ceil(community?.pageInfo?.totalItems / itemsPerPage);
        raw = raw.concat(community?.data);
        page++;
      }
      if (!raw.length) return;

      const grantsWithProjects = raw
      if (!grantsWithProjects) return;


      console.log("Grants with projects for community", communityID, grantsWithProjects.length);

      return grantsWithProjects;
    })
  ).catch((error) => console.log(error));

  let final: MetadataRoute.Sitemap = [];
  const uniqueProjectUrls = new Set<string>();


  (fetchProjects as any[])
    .flat()
    .filter((grant) => grant?.project)
    .forEach((grant) => {
      const projectUrl = `https://gap.karmahq.xyz/project/${grant.project?.details?.data?.uid ||
        grant.project?.details?.data?.slug ||
        grant.project?.data?.slug ||
        grant.project?.data?.uid ||
        grant.project?.slug ||
        grant.project?.uid}`;


      // Add project URL only if it's not already in the set
      if (!uniqueProjectUrls.has(projectUrl)) {
        uniqueProjectUrls.add(projectUrl);
        final.push({
          url: projectUrl,
          lastModified: new Date().toISOString(),
          changeFrequency: "daily",
          priority: 1,
        });

        // For impact page
        final.push({
          url: `https://gap.karmahq.xyz/project/${grant.project?.details?.data?.uid ||
            grant.project?.details?.data?.slug ||
            grant.project?.data?.slug ||
            grant.project?.data?.uid ||
            grant.project?.slug ||
            grant.project?.uid}/impact`,
          lastModified: new Date().toISOString(),
          changeFrequency: "daily",
          priority: 1,
        });
      }

      // For grant pages
      final.push({
        url: `https://gap.karmahq.xyz/project/${grant.project?.details?.data?.uid ||
          grant.project?.details?.data?.slug ||
          grant.project?.data?.slug ||
          grant.project?.data?.uid ||
          grant.project?.slug ||
          grant.project?.uid}/grants/${grant.uid}`,
        lastModified: new Date().toISOString(),
        changeFrequency: "daily",
        priority: 1,
      });

      // For milestone and updates pages
      final.push({
        url: `https://gap.karmahq.xyz/project/${grant.project?.details?.data?.uid ||
          grant.project?.details?.data?.slug ||
          grant.project?.data?.slug ||
          grant.project?.data?.uid ||
          grant.project?.slug ||
          grant.project?.uid}/grants/${grant.uid}/milestones-and-updates`,
        lastModified: new Date().toISOString(),
        changeFrequency: "daily",
        priority: 1,
      });
    });

  console.log("Totally ", final.length, " URLs generated on sitemap");

  return final;
}
