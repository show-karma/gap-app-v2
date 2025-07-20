import { defaultMetadata } from "@/utilities/meta";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Spinner } from "@/components/ui/spinner";
import { zeroUID } from "@/utilities/commons";
import { getCommunityData } from "@/utilities/queries/getCommunityData";
import { TracksAdminPage } from "@/features/tracks/components/tracks-admin-page";

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
      <TracksAdminPage communityId={communityId} community={community} />
    </Suspense>
  );
}
