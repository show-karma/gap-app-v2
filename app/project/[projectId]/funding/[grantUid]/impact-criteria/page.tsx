import { GrantImpactCriteria } from "@/components/Pages/Grants/ImpactCriteria";
import { Metadata } from "next";
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
  return createGrantMetadataFromContext(null, null, projectId, grantUid, 'impact-criteria');
}

export default function Page() {
  return <GrantImpactCriteria />;
}
