import { Suspense } from "react";
import { CommunityAdminPage } from "@/components/Pages/Communities/CommunityAdminPage";
import { Spinner } from "@/components/Utilities/Spinner";
import { defaultMetadata } from "@/utilities/meta";
import { getCommunityDataV2 } from "@/utilities/queries/getCommunityData";

export const metadata = defaultMetadata;

interface Props {
  params: Promise<{ communityId: string }>;
}

export default async function Page(props: Props) {
  const { communityId } = await props.params;
  const community = await getCommunityDataV2(communityId);

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
