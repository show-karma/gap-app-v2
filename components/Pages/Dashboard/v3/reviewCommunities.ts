import type { DashboardAdminCommunity } from "@/hooks/useDashboardAdmin";
import type { FundingProgram } from "@/services/fundingPlatformService";
import type { Community } from "@/types/v2/community";

export interface ReviewerCommunity {
  /** Slug (preferred) or UID — the identifier RBAC + the inbox endpoint key on. */
  id: string;
  community: Community;
}

/** Build the minimal `Community` shape the reviewer inbox reads from a program. */
function toCommunity(program: FundingProgram): Community {
  return {
    uid: (program.communityUID ?? "") as `0x${string}`,
    chainID: program.chainID,
    details: {
      name: program.communityName ?? program.communitySlug ?? "Community",
      slug: program.communitySlug ?? program.communityUID ?? "",
      logoUrl: program.communityImage,
    },
  };
}

/** Build the `Community` shape the reviewer inbox reads from an admin community. */
function adminToCommunity(admin: DashboardAdminCommunity): Community {
  return {
    uid: admin.uid as `0x${string}`,
    chainID: admin.chainID,
    details: { name: admin.name, slug: admin.slug, logoUrl: admin.logoUrl },
  };
}

/**
 * Derive the distinct communities a user can review in — from reviewer-role
 * programs plus admin/owner communities with pending applications. A community
 * can surface under either its slug or its uid, so each is claimed against a
 * shared seen-set: whichever source hits it first wins, and it's never listed
 * twice.
 *
 * Kept in a light, component-free module so both the "My reviews" tile summary
 * hook (eager) and the code-split drill-in view can share it without pulling the
 * heavy inbox into the initial bundle.
 */
export function deriveReviewerCommunities(
  programs: FundingProgram[],
  adminCommunities: DashboardAdminCommunity[]
): ReviewerCommunity[] {
  const map = new Map<string, Community>();
  const seen = new Set<string>();
  const claim = (community: Community, ...ids: Array<string | undefined | null>) => {
    const key = ids.find((id): id is string => !!id);
    if (!key) return;
    if (ids.some((id) => id && seen.has(id.toLowerCase()))) return;
    for (const id of ids) if (id) seen.add(id.toLowerCase());
    map.set(key, community);
  };

  for (const program of programs) {
    claim(toCommunity(program), program.communitySlug, program.communityUID);
  }
  // Community admins/owners can review applications in their own communities
  // even without an explicit reviewer-role program.
  for (const admin of adminCommunities) {
    if (admin.pendingApplicationsCount <= 0) continue;
    claim(adminToCommunity(admin), admin.slug, admin.uid);
  }
  return Array.from(map, ([id, community]) => ({ id, community }));
}
