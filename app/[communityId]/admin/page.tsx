import { defaultMetadata } from "@/utilities/meta";
import { gapIndexerApi } from "@/utilities/gapIndexerApi";
import { notFound } from "next/navigation";
import { CommunityAdminPage } from "@/components/Pages/Communities/CommunityAdminPage";
import { zeroUID } from "@/utilities/commons";
import { Suspense } from "react";
import { Spinner } from "@/components/Utilities/Spinner";

export const metadata = defaultMetadata;

interface Props {
  params: { communityId: string };
}

export default async function Page({ params }: Props) {
  const communityId = params.communityId;
  const { data: community } = await gapIndexerApi.communityBySlug(communityId);
  if (!community || community?.uid === zeroUID) {
    notFound();
  }

  return (
    <Suspense
      fallback={
        <div className="flex w-full items-center justify-center">
          <Spinner />
        </div>
      }
    >
      <CommunityAdminPage communityId={communityId} community={community} />
    </Suspense>
  );
}
