import { MilestonesReviewPage } from "@/components/Pages/Admin/MilestonesReview";
import { defaultMetadata } from "@/utilities/meta";
import { Metadata } from "next";

export const metadata: Metadata = defaultMetadata;

type Params = Promise<{
  communityId: string;
  projectId: string;
}>;

type SearchParams = Promise<{
  programIds?: string;
}>;

export default async function Page(props: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { communityId, projectId } = await props.params;
  const { programIds } = await props.searchParams;

  return (
    <MilestonesReviewPage
      communityId={communityId}
      projectId={projectId}
      programId={programIds || ""}
    />
  );
}
