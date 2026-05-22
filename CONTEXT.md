# gap-app-v2

Next.js frontend for the Karma ecosystem. Renders project profiles, funding flows, admin dashboards, and embeds Web3 (Privy + Wagmi) for attestation actions.

## Language

### RBAC flags

**Project Owner**:
The wallet address recorded as the on-chain owner of a Project attestation. Read via `useProjectStore.isProjectOwner`, set by `useProjectPermissions()`.

**Project Admin**:
A wallet granted admin rights to a Project on-chain (separate from owner). Read via `useProjectStore.isProjectAdmin`.

**Contract Owner**:
The wallet that owns the GAP smart contract — a global super-admin role. Read via `useOwnerStore.isOwner`, set by `useContractOwner()`. Mounted globally in `PermissionsProvider`.
_Avoid_: Super admin (which means a different backend role; see `Role.SUPER_ADMIN`).

**Community Admin (per-grant)**:
True when the current user is an admin of the specific Community attached to the grant currently in scope. Read via `useCommunityAdminStore.isCommunityAdmin`. Only set inside grant-scoped contexts (e.g. `GrantDetailLayout`, `CompleteGrant`) via `useIsCommunityAdmin(grant.communityUID, …, { zustandSync })`.
_Avoid_: "Community admin" without qualifier — ambiguous with the broader flag below.

**Community Admin of Any**:
True when the current user is an admin of at least one Community in the system. Derived from `useCommunitiesStore.communities.length > 0`. Populated globally by `useAdminCommunities()` mounted in `PermissionsProvider`.
_Avoid_: `isCommunityAdminOfSome` is the convention for the boolean derivation — don't reinvent.

## Relationships

- A user can be **Community Admin of Any** without being **Community Admin (per-grant)** in any given page context (no grant in scope).
- A user who is **Community Admin (per-grant)** for a grant is always a **Community Admin of Any** — the inverse is not true.
- Pages on the project profile root (no grant in URL) gate management UIs on **Community Admin of Any**. Pages scoped to a specific grant gate on **Community Admin (per-grant)**.

## Example dialogue

> **Dev:** "Should the '+ Add Funding' button show for community admins?"
> **Domain expert:** "Yes — if the user is **Community Admin of Any**. They'll pick which of their communities the grant attributes to inside the form."
> **Dev:** "What about the 'Complete grant' button on a specific grant page?"
> **Domain expert:** "That's **Community Admin (per-grant)** — they must admin the grant's own community to complete it, not just any community."

## Flagged ambiguities

- The unqualified term "community admin" was used to gate behavior on both the project profile root (where the per-grant flag is always false) and grant-scoped pages — causing the "+ Add Funding" button and "set up payout" CTA to be hidden for users who legitimately had access. Resolved: always qualify as **per-grant** or **of-any**.
