import ImpactWrapper from "@/components/Pages/Project/Impact/ImpactWrapper";
import { Metadata } from "next";
import { gapIndexerApi } from "@/utilities/gapIndexerApi";
import { createMetadataFromContext } from "@/utilities/metadata/projectMetadata";

export async function generateMetadata({
  params,
}: {
  params: { projectId: string };
}): Promise<Metadata> {
  const projectId = params.projectId;

  // Use our new optimized API call and metadata generation
  try {
    const projectInfo = await gapIndexerApi
      .projectBySlug(projectId)
      .then((res) => res.data)
      .catch(() => null);

    return createMetadataFromContext(projectInfo, projectId, 'impact');
  } catch (error) {
    console.error('Error generating impact page metadata:', error);
    return createMetadataFromContext(null, projectId, 'impact');
  }
}

export default function Page() {
  return <ImpactWrapper />;
}
