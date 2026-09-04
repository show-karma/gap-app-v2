import { permanentRedirect } from "next/navigation";
import { PAGES } from "@/utilities/pages";
import { buildWhitelabelRedirectPath, getWhitelabelContext } from "@/utilities/whitelabel-server";

type Props = {
  params: Promise<{ communityId: string; referenceNumber: string }>;
};

// This page only issues a 308. There is nothing to prerender and no sample worth
// inventing: a fabricated referenceNumber would bake a redirect for an id that
// does not exist. Same shape, same answer as `manage/payouts` on this branch.
export const instant = false;

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
