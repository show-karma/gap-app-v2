import { notFound } from "next/navigation";
import { Suspense } from "react";
import { TracksAdminPage } from "@/components/Pages/Communities/TracksAdminPage";
import { Spinner } from "@/components/Utilities/Spinner";
import { defaultMetadata } from "@/utilities/meta";
import { getCommunityDetails } from "@/utilities/queries/v2/community";

export const metadata = defaultMetadata;

interface Props {
  params: Promise<{ communityId: string }>;
}

export default async function Page(props: Props) {
  const { communityId } = await props.params;
  const community = await getCommunityDetails(communityId);

  if (!community) {
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
