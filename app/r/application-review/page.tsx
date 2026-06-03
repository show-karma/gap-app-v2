import { notFound, redirect } from "next/navigation";
import { normalizeProgramId } from "@/utilities/normalizeProgramId";
import { PAGES } from "@/utilities/pages";
import { buildWhitelabelRedirectPath, getWhitelabelContext } from "@/utilities/whitelabel-server";
import { resolveCommunitySlug } from "../_lib/resolve-review-redirect";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  programId?: string;
  referenceNumber?: string;
}>;

/**
 * Permalink resolver for application reviews. The backend links here with stable
 * identifiers; this route owns the frontend route structure and whitelabel
 * host, resolves the community, and redirects to the canonical manage page.
 */
export default async function ApplicationReviewRedirectPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { programId, referenceNumber } = await searchParams;
  if (!programId || !referenceNumber) notFound();

  const communitySlug = await resolveCommunitySlug(programId);
  if (!communitySlug) notFound();

  const target = PAGES.MANAGE.FUNDING_PLATFORM.APPLICATION_DETAIL(
    communitySlug,
    normalizeProgramId(programId),
    referenceNumber
  );

  const ctx = await getWhitelabelContext();
  redirect(buildWhitelabelRedirectPath(target, ctx));
}
