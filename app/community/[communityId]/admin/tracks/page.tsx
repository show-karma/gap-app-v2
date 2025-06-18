import { defaultMetadata } from "@/utilities/meta";
import { gapIndexerApi } from "@/utilities/gapIndexerApi";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Spinner } from "@/components/Utilities/Spinner";
import { zeroUID } from "@/utilities/commons";
import { TracksAdminPage } from "@/components/Pages/Communities/TracksAdminPage";

export const metadata = defaultMetadata;

interface Props {
  params: Promise<{ communityId: string }>;
}

export default async function Page(props: Props) {
  const params = await props.params;
  const communityId = params.communityId;
  const { data: community } = await gapIndexerApi
    .communityBySlug(communityId)
    .catch(() => {
      notFound();
    });
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
