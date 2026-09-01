import { permanentRedirect } from "next/navigation";
import { PAGES } from "@/utilities/pages";
import { buildWhitelabelRedirectPath, getWhitelabelContext } from "@/utilities/whitelabel-server";

type Props = {
  params: Promise<{ communityId: string; referenceNumber: string }>;
};

// Stable URL consolidation: /browse-applications/:ref → /applications/:ref (308)
export default async function ApplicationDetailsPage({ params }: Props) {
  const { communityId, referenceNumber } = await params;
  const ctx = await getWhitelabelContext();
  permanentRedirect(
    buildWhitelabelRedirectPath(
      PAGES.COMMUNITY.APPLICATION_DETAIL(communityId, referenceNumber),
      ctx
    )
  );
}
