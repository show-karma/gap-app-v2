import { GrantOverview } from "@/components/Pages/Project/Grants/Overview";
import { ProjectGrantsOverviewLoading } from "@/components/Pages/Project/Loading/Grants/Overview";
import { Metadata } from "next";
import { Suspense } from "react";
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
  return createGrantMetadataFromContext(null, null, projectId, grantUid, 'overview');
}

const Page = () => {
  return (
    <Suspense fallback={<ProjectGrantsOverviewLoading />}>
      <GrantOverview />
    </Suspense>
  );
};

export default Page;
