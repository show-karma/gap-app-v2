import { notFound, redirect } from "next/navigation";
import { normalizeProgramId } from "@/utilities/normalizeProgramId";
import { PAGES } from "@/utilities/pages";
import { buildWhitelabelRedirectPath, getWhitelabelContext } from "@/utilities/whitelabel-server";
import { resolveCommunitySlug } from "../_lib/resolve-review-redirect";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  programId?: string;
  projectUID?: string;
  milestoneUID?: string;
}>;

/**
 * Permalink resolver for milestone reviews. The backend (emails, the AI agent
 * via `reviewUrl`) links here with stable identifiers; this route owns the
 * frontend route structure and whitelabel host, resolves the community, and
 * redirects to the canonical manage page. Route changes stay in this repo.
 */
export default async function MilestoneReviewRedirectPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { programId, projectUID, milestoneUID } = await searchParams;
  if (!programId || !projectUID) notFound();

  const communitySlug = await resolveCommunitySlug(programId);
  if (!communitySlug) notFound();

  const target = PAGES.MANAGE.FUNDING_PLATFORM.MILESTONES(
    communitySlug,
    normalizeProgramId(programId),
    projectUID,
    milestoneUID
  );

  const ctx = await getWhitelabelContext();
  redirect(buildWhitelabelRedirectPath(target, ctx));
}
