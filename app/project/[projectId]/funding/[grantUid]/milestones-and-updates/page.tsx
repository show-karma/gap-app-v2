import MilestonesAndUpdates from "@/components/Pages/Grants/MilestonesAndUpdates";
import { Metadata } from "next";
import { Suspense } from "react";
import { ProjectGrantsMilestonesAndUpdatesLoading } from "@/components/Pages/Project/Loading/Grants/MilestonesAndUpdate";
import { createGrantMetadataFromContext } from "@/utilities/metadata/projectMetadata";

export async function generateMetadata({
  params,
}: {
  params: {
    projectId: string;
    grantUid: string;
  };
}): Promise<Metadata> {
  const projectId = params?.projectId as string;
  const grantUid = params?.grantUid as string;

  // Return basic metadata - parent layout provides the SEO data
  return createGrantMetadataFromContext(null, null, projectId, grantUid, 'milestones');
}

const Page = () => {
  return (
    <Suspense fallback={<ProjectGrantsMilestonesAndUpdatesLoading />}>
      <MilestonesAndUpdates />
    </Suspense>
  );
};

export default Page;
