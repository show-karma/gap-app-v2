import { defaultMetadata } from "@/utilities/meta";
import { gapIndexerApi } from "@/utilities/gapIndexerApi";
import { notFound } from "next/navigation";
import { zeroUID } from "@/utilities/commons";
import { ReportMilestonePage } from "@/components/Pages/Admin/ReportMilestonePage";

export const metadata = defaultMetadata;

interface Props {
  params: { communityId: string };
}

export default async function Page({ params }: Props) {
  const communityId = params.communityId;
  const { data: community } = await gapIndexerApi
    .communityBySlug(communityId)
    .catch(() => {
      notFound();
    });
  if (!community || community?.uid === zeroUID) {
    notFound();
  }

  return <ReportMilestonePage community={community} />;
}
