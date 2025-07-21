import { defaultMetadata } from "@/lib/metadata/meta";
import { notFound } from "next/navigation";
import { zeroUID } from "@/lib/utils/misc";
import { Suspense } from "react";
import { Spinner } from "@/components/ui/spinner";
import { getCommunityData } from "@/lib/queries/getCommunityData";
import CommunityAdminPage from "@/features/communities/components/community-page/admin-page";

export const metadata = defaultMetadata;

interface Props {
  params: Promise<{ communityId: string }>;
}

export default async function Page(props: Props) {
  const { communityId } = await props.params;
  const community = await getCommunityData(communityId);
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
