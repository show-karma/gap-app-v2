import { zeroUID } from "@/utilities/commons";
import { gapIndexerApi } from "@/utilities/gapIndexerApi";
import { defaultMetadata } from "@/utilities/meta";
import { notFound } from "next/navigation";

export const metadata = defaultMetadata;

interface Props {
  params: { communityId: string };
  children: React.ReactNode;
}

export default async function AdminLayout({ children, params }: Props) {
  const communityId = params.communityId;
  const { data: community } = await gapIndexerApi
    .communityBySlug(communityId)
    .catch(() => {
      notFound();
    });
  if (!community || community?.uid === zeroUID) {
    notFound();
  }
  return <div className="py-1">{children}</div>;
}
