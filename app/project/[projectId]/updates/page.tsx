import { ProjectRoadmap } from "@/components/Pages/Project/Roadmap";
import { Metadata } from "next";
import { gapIndexerApi } from "@/utilities/gapIndexerApi";
import { createMetadataFromContext } from "@/utilities/metadata/projectMetadata";

export async function generateMetadata({
  params,
}: {
  params: {
    projectId: string;
  };
}): Promise<Metadata> {
  const projectId = params?.projectId as string;

  // Use our new optimized API call and metadata generation
  try {
    const projectInfo = await gapIndexerApi
      .projectBySlug(projectId)
      .then((res) => res.data)
      .catch(() => null);

    return createMetadataFromContext(projectInfo, projectId, 'updates');
  } catch (error) {
    console.error('Error generating updates page metadata:', error);
    return createMetadataFromContext(null, projectId, 'updates');
  }
}

export default function RoadmapPage() {
  // The ProjectRoadmap component will get project data from context
  // No need to fetch data here since the layout already provides it via context
  return <ProjectRoadmap />;
}
