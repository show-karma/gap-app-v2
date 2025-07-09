import { ProjectRoadmap } from "@/components/Pages/Project/Roadmap";
import { envVars } from "@/utilities/enviromentVars";
import { getAllMilestones } from "@/utilities/gapIndexerApi/getAllMilestones";
import { defaultMetadata } from "@/utilities/meta";
import { getQueryClient } from "@/utilities/queries/client";
import { getProjectCachedData } from "@/utilities/queries/getProjectCachedData";
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import { Metadata } from "next";

type Params = Promise<{
  projectId: string;
}>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { projectId } = await params;
  const projectInfo = await getProjectCachedData(projectId);

  let metadata = {
    title: defaultMetadata.title,
    description: defaultMetadata.description,
    twitter: defaultMetadata.twitter,
    openGraph: defaultMetadata.openGraph,
    icons: defaultMetadata.icons,
  };

  metadata = {
    ...metadata,
    title: `${projectInfo?.details?.data?.title} Updates | Karma GAP`,
    description: `Explore the updates of ${projectInfo?.details?.data?.title} on Karma GAP.`,
  };

  return {
    title: metadata.title,
    description: metadata.description,
    twitter: {
      creator: defaultMetadata.twitter.creator,
      site: defaultMetadata.twitter.site,
      card: "summary_large_image",
      images: [
        {
          url: `${envVars.VERCEL_URL}/api/metadata/projects/${projectId}`,
          alt: metadata.title,
        },
      ],
    },
    openGraph: {
      url: defaultMetadata.openGraph.url,
      title: metadata.title,
      description: metadata.description,
      images: [
        {
          url: `${envVars.VERCEL_URL}/api/metadata/projects/${projectId}`,
          alt: metadata.title,
        },
      ],
      // site_name: defaultMetadata.openGraph.siteName,
    },
    icons: metadata.icons,
  };
}

export default async function RoadmapPage(props: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await props.params;
  const projectInfo = await getProjectCachedData(projectId);

  const queryClient = getQueryClient();

  await queryClient.prefetchQuery({
    queryKey: ["all-milestones", projectId],
    queryFn: async () => {
      return await getAllMilestones(projectId, projectInfo?.grants || []);
    },
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ProjectRoadmap />
    </HydrationBoundary>
  );
}
