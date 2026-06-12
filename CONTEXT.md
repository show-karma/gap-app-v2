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

### Reviewer roles

**Application Reviewer**:
A wallet assigned to review funding **Applications** for a program. Detected via the RBAC `reviewerTypes` containing `ReviewerType.PROGRAM` (`useIsReviewerType(ReviewerType.PROGRAM)`), or cross-community via `useReviewerPrograms()`. Per-program list via `useProgramReviewers(programId)`.
_Avoid_: "Program Reviewer" and "App reviewer" — both are code-internal names for this same role (`ReviewerType.PROGRAM` in `src/core/rbac/types/role.ts`; `ReviewerType.APP` in the legacy `hooks/useReviewerAssignment.ts`). Use **Application Reviewer** in product language.

**Milestone Reviewer**:
A wallet assigned to verify grantee **Milestone** completions for a program. Detected via `useIsReviewerType(ReviewerType.MILESTONE)`; per-program list via `useMilestoneReviewers(programId)`; cross-program via `useCommunityMilestoneReviewers(programIds)`.

**Reviewer Inbox**:
A community-scoped page (`/community/[communityId]/manage/inbox`) that unifies everything assigned to the current user as a reviewer **within one community, across all its programs**. Shows the **Application** review stream to an **Application Reviewer**, the **Milestone** review stream to a **Milestone Reviewer**, and both to a user holding both roles. The streams shown derive from the user's actual roles — not a manual switch.
_Avoid_: "persona switcher" — a device in the design mock only; the real page derives streams from roles.

**Review bucket**:
The priority grouping each Inbox item falls into, framed by "who must act next":
- **Waiting on you** (action): the reviewer must act. Applications: `pending`, `under_review`, `resubmitted`. Milestones: `completed` (grantee submitted proof, awaiting verification).
- **In progress** (waiting): action is on the other party. Applications: `revision_requested` (back with the applicant). Milestones: `pending` (grantee has not submitted completion yet).
- **Cleared** (done): no action needed. Applications: `approved`, `rejected`. Milestones: `verified`.

### Funding platform form fields

**Metric (intake form field)**:
A repeatable custom field type on a program's application form. Each entry captures four free-text values — **Metric**, **Data Source**, **How It's Measured**, **Target** — stored verbatim as JSON inside the application's `applicationData`. It is pure captured text: nothing is anchored on-chain and it does not flow into the **Indicator** system. Modeled on the **Milestone** field type, which (unlike Metric) the indexer anchors on-chain as attestations.
_Avoid_: conflating with **Indicator** — see below.

**Indicator**:
Structured, queryable project-level impact data tracked over time (project outputs/KPIs), exposed via project-profile and community-metrics endpoints. Lives at the project layer, independent of any single application.

## Relationships

- A user can be **Community Admin of Any** without being **Community Admin (per-grant)** in any given page context (no grant in scope).
- A user who is **Community Admin (per-grant)** for a grant is always a **Community Admin of Any** — the inverse is not true.
- Pages on the project profile root (no grant in URL) gate management UIs on **Community Admin of Any**. Pages scoped to a specific grant gate on **Community Admin (per-grant)**.
- The **Reviewer Inbox** aggregates an **Application Reviewer**'s queue across all programs in one community via a dedicated gap-indexer endpoint (merge/sort/bucket server-side) — not by frontend fan-out across per-program feeds. The **Milestone Reviewer** queue already aggregates cross-program through the milestones-report data layer (`useReportPageData`).

## Example dialogue

> **Dev:** "Should the '+ Add Funding' button show for community admins?"
> **Domain expert:** "Yes — if the user is **Community Admin of Any**. They'll pick which of their communities the grant attributes to inside the form."
> **Dev:** "What about the 'Complete grant' button on a specific grant page?"
> **Domain expert:** "That's **Community Admin (per-grant)** — they must admin the grant's own community to complete it, not just any community."

## Flagged ambiguities

- The unqualified term "community admin" was used to gate behavior on both the project profile root (where the per-grant flag is always false) and grant-scoped pages — causing the "+ Add Funding" button and "set up payout" CTA to be hidden for users who legitimately had access. Resolved: always qualify as **per-grant** or **of-any**.
- "Metric" is overloaded: the **Metric** intake form field (free-text captured on an application) is distinct from the project-level **Indicator** system (structured, on-chain-adjacent impact data). The intake field deliberately does not feed Indicators. Always qualify which one is meant.
- The **Application Reviewer** role has three names in code: `ReviewerType.PROGRAM` (canonical RBAC), `ReviewerType.APP` (legacy `useReviewerAssignment`), and "Application reviewer" (product/design language). They are the same role. Resolved: product language is **Application Reviewer**; the canonical RBAC enum is `ReviewerType.PROGRAM`.
- The actionable milestone state — grantee has submitted proof and the reviewer must verify — is `completed` in the codebase (`MilestoneStatusEntry.currentStatus`), but the design mock labels it `pending_verification` and shows it as "Needs verification". Same state. Resolved: the underlying status is `completed`; the **Waiting on you** UI label is "Needs verification".
