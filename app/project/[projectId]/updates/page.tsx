import { ProjectRoadmap } from "@/components/Pages/Project/Roadmap";
import { Metadata } from "next";
import { createMetadataFromContext } from "@/utilities/metadata/projectMetadata";

export async function generateMetadata({
  params,
}: {
  params: {
    projectId: string;
  };
}): Promise<Metadata> {
  const projectId = params?.projectId as string;

  // Return basic metadata - parent layout provides the SEO data
  return createMetadataFromContext(null, projectId, 'updates');
}

export default function Page() {
  return <ProjectRoadmap />;
}
