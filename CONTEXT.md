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

### Content surfaces

**Blog post**:
A dated marketing/announcement article authored by non-devs in a headless CMS, served on-domain under `/blog/<slug>`. New posts publish here only; the external Paragraph blog (`paragraph.xyz/@karmahq`) is a frozen archive — its posts were deliberately not migrated (fresh-start decision, Jul 2026) and nothing new publishes there.
_Avoid_: "article" unqualified — ambiguous with **Knowledge article**.

**Knowledge article**:
An evergreen, undated reference page under `/knowledge`, hand-coded as TSX in the repo with per-page JSON-LD, published only via dev PR.
_Avoid_: "blog post" for these — they are deliberately not dated and not CMS-managed.

### Domains and hosts

Every karmahq host in this repo comes from **`utilities/domains.ts`**. No other file may
contain a literal `karmahq.org` or `karmahq.xyz` — see the exceptions below.

**Canonical host** (`CANONICAL_HOST` / `CANONICAL_ORIGIN`):
`www.karmahq.org`. The **one** host that serves 200s (ADR 0001). `SITE_URL` in
`utilities/meta.ts` is this value, so every absolute URL the app emits — metadata, OG tags,
sitemaps, `robots.txt`, JSON-LD, `.well-known` documents — follows it automatically.
_Avoid_: writing "the main domain" — always say whether you mean the canonical host or the apex.

**Alias host** (`ALIAS_HOSTS`, `isAliasHost()`):
Any host that owes **exactly one 308** to the canonical origin — `karmahq.org` (apex),
`karmahq.xyz`, `www.karmahq.xyz`, `gap.karmahq.xyz`. `www.karmahq.xyz` was
the canonical host until Aug 2026 and is now an alias; that is the single biggest behavioural
change of the TLD migration. Note there is no `gap.karmahq.org`: `gap.` exists only on the
legacy root, because GAP was the original product name and `gap.karmahq.xyz` was its first
host. Aliases are hosts that really resolve, not hosts derived from a naming pattern.
_Invariant_: the canonical host is **never** an alias. `domains.ts` throws at module load if it
ever is, because nothing in `proxy.ts` compares the redirect target to the request host — a
canonical host inside `ALIAS_HOSTS` would 308 to itself forever with no circuit breaker.

**Legacy root domain** (`LEGACY_ROOT_DOMAINS`):
`karmahq.xyz`. **Permanent.** Immutable on-chain EAS attestation payloads embed `.xyz` URLs and
the indexer re-derives them from chain on every re-index, so they can never be rewritten. The
alias tier is the only thing keeping those URLs resolvable. Any proposal to remove `.xyz` is
wrong by construction; the registration is a permanent cost.

**Legacy umbrella host** (`LEGACY_UMBRELLA_HOSTS`):
`app.karmahq.xyz` / `testapp.karmahq.xyz`. Former umbrella hosts that only ever **301** away,
and that **rewrite the path** (`/<tenantId>/…` → `/community/<tenantId>/…`) on the way. Not
flipping. Retargeting anything at them, or them at `appOrigin()`, changes URL *shape*, not just
origin.
_Avoid_: treating them as interchangeable with the canonical origin.

**Shared domain** vs **whitelabel tenant domain** (`DOMAIN_CONFIGS`, `isSharedDomain()`):
A shared domain hosts all tenants under `/community/<slug>`; a tenant domain (`app.filpgf.io`,
`grantsapp.scroll.io`, …) hosts exactly one. `isSharedDomain()` **fails open to `true`** for any
host absent from `DOMAIN_CONFIGS`, so dropping a row degrades silently — which is why the `.xyz`
rows stay listed permanently. `www.*` is deliberately **absent**: adding it would activate a
`/<slug>` → tenant 301 branch that has never executed in production.

**Hosts that did NOT flip to `.org`** — leave them alone unless a ticket says otherwise:
`gapapi` / `gapstagapi` (moving them invalidates every live MCP OAuth token — scalar `aud`,
exact equality), `gov` / `govstag` (separate repo), `docs.gap` (GitBook), `privy` (Privy custom
auth domain — `privy.karmahq.org` was **added** to the CSP alongside it, never substituted),
`api` / `anon` (not served by this tree), and **every `@karmahq.xyz` email address** (SPF/DKIM
do not exist for `.org`; flipping a `From` header first silently degrades deliverability).

Full migration record: [`docs/DOMAIN_MIGRATION.md`](docs/DOMAIN_MIGRATION.md).
Cutover procedure: [`../docs/runbooks/domain-migration-karmahq-org.md`](../docs/runbooks/domain-migration-karmahq-org.md).

### Donor research — persona

**Donor handle**:
An advisor-private, opaque label for one donor the advisor researches (`DonorHandle`, fields `opaqueLabel` + `notes`). One advisor owns many handles. Cross-advisor access returns **404**, never 403 (no existence leak).

**Handle notes**:
Free-text the advisor keeps on a handle that is **private and never used by research** (the "Notes" section of the detail page). Distinct from **Persona source**, which *is* fed to research. Persisted on `donor_handle` itself via `PATCH /handles/:id`.

**Donor persona**:
A 1:1 record per **Donor handle** that captures who this donor is, as a *default* that prefills new reports. Authored by the advisor; refined by an LLM. Lives at `…/handles/:id/persona`. A handle may have **no** persona — `GET` returns **404**, which the FE treats as the normal empty state (`data: null`), not an error.
_Avoid_: "persona switcher" — an unrelated, abandoned design-mock device (see Reviewer Inbox). The Donor persona is a real persisted entity; the persona switcher never existed.

**Persona source** (`sourceText`):
The single free-text field the advisor writes — donor letters, kickoff notes — that the LLM **refine** step reads. Encrypted at rest. This, not **Handle notes**, is what influences research.

**Narrative** (`narrative`):
The LLM-produced prose summary of the **Persona source**. Read live at synthesis time. Editable by the advisor.

**Structured chips**:
Five low-cardinality enum fields extracted from the source — `orgMaturity`, `geoRadius`, `faithStance`, `giftSizeBand`, `advocacyStance` — each carrying **provenance**.

**Provenance** (`source`):
Per-chip origin: `extracted` (set by the LLM refine, shows an "AI" badge) vs `manual` (the advisor set/edited it, no badge) vs `null` (no value). Invariant: `value: null` ⇒ `source: null`. Editing a chip flips it `extracted → manual`.

**Refine**:
The `POST …/persona/refine` LLM call. **Does not persist** — it returns a `{ narrative, structured }` preview the advisor reviews, edits, then commits via `PUT`. Never fabricates: an uncertain field returns `{ value: null, source: null }`. Rate-limit channel `persona_refine` (20/hr/advisor).

**Computed weights** (`computedWeights`):
The five scoring weights (basis points, summing to 10000) the backend **recomputes server-side on every `GET`** from the structured chips (the "nudge"). The FE consumes them verbatim and **never** mirrors the nudge math. Same five dimensions as **Composite weights** (`onlinePresence`, `socialPresence`, `impactRecency`, `donorMatch`, `compliance`).

## Relationships

- A user can be **Community Admin of Any** without being **Community Admin (per-grant)** in any given page context (no grant in scope).
- A user who is **Community Admin (per-grant)** for a grant is always a **Community Admin of Any** — the inverse is not true.
- Pages on the project profile root (no grant in URL) gate management UIs on **Community Admin of Any**. Pages scoped to a specific grant gate on **Community Admin (per-grant)**.
- The **Reviewer Inbox** aggregates an **Application Reviewer**'s queue across all programs in one community via a dedicated gap-indexer endpoint (merge/sort/bucket server-side) — not by frontend fan-out across per-program feeds. The **Milestone Reviewer** queue already aggregates cross-program through the milestones-report data layer (`useReportPageData`).
- A **Blog post**'s slug is immutable once published — changing it requires an explicit redirect entry. Tags/categories are post fields only, never indexable pages (v1). Blog URLs enter the sitemap via gap-app-v2 (frontend queries the CMS), not via gap-indexer's sitemap pipeline.
- **Blog posts** exist only on the Karma main domain: whitelabel tenant domains 301-redirect `/blog*` to the main domain (middleware branch), so blog SEO never splits across tenant hosts. Per-tenant blogs are explicitly out of scope for v1. (Note: `/knowledge` currently leaks onto whitelabel domains via top-level passthrough — known, tracked separately.)
- A **Donor persona** is a *default*, never authoritative: it prefills the report-create form, but per-report criteria and weights override it. The report-create form **never writes back** to the persona, and editing a persona **never** alters already-created reports (the backend snapshots persona onto the report at create-time only).
- **Persona source** feeds research; **Handle notes** never do. Both live on the same handle's detail page but in deliberately separated, labeled sections.
- Advisor-authenticated donor-research calls (handles, reports, persona) go **direct browser → indexer** with a Privy `Bearer` JWT (`fetchData`). There is **no Next proxy** in this path — the `app/api/donor-research/*` routes exist only for the token-based **shared-report commenting** flow.

## Example dialogue

> **Dev:** "Should the '+ Add Funding' button show for community admins?"
> **Domain expert:** "Yes — if the user is **Community Admin of Any**. They'll pick which of their communities the grant attributes to inside the form."
> **Dev:** "What about the 'Complete grant' button on a specific grant page?"
> **Domain expert:** "That's **Community Admin (per-grant)** — they must admin the grant's own community to complete it, not just any community."

## Flagged ambiguities

- "Blog" vs "Knowledge": both are long-form on-site content, but **Blog posts** (dated, CMS-authored, `/blog`) and **Knowledge articles** (evergreen, code-authored, `/knowledge`) are distinct surfaces that cross-link and keep separate indexes. The footer's "Blog" link historically pointed to the external Paragraph blog (`SOCIALS.PARAGRAPH`) — after the blog integration it points to `/blog`.
- The unqualified term "community admin" was used to gate behavior on both the project profile root (where the per-grant flag is always false) and grant-scoped pages — causing the "+ Add Funding" button and "set up payout" CTA to be hidden for users who legitimately had access. Resolved: always qualify as **per-grant** or **of-any**.
- "Metric" is overloaded: the **Metric** intake form field (free-text captured on an application) is distinct from the project-level **Indicator** system (structured, on-chain-adjacent impact data). The intake field deliberately does not feed Indicators. Always qualify which one is meant.
- The **Application Reviewer** role has three names in code: `ReviewerType.PROGRAM` (canonical RBAC), `ReviewerType.APP` (legacy `useReviewerAssignment`), and "Application reviewer" (product/design language). They are the same role. Resolved: product language is **Application Reviewer**; the canonical RBAC enum is `ReviewerType.PROGRAM`.
- The actionable milestone state — grantee has submitted proof and the reviewer must verify — is `completed` in the codebase (`MilestoneStatusEntry.currentStatus`), but the design mock labels it `pending_verification` and shows it as "Needs verification". Same state. Resolved: the underlying status is `completed`; the **Waiting on you** UI label is "Needs verification".
- "Persona" is overloaded: **Donor persona** (a real persisted 1:1 entity per donor handle, this feature) is unrelated to the abandoned **"persona switcher"** UI device from the Reviewer Inbox design mock. Resolved: "persona" in donor-research always means the **Donor persona** entity; the switcher does not exist.
- "Notes" vs "source": **Handle notes** (`donor_handle.notes`, private, not used by research) is distinct from **Persona source** (`donor_persona.sourceText`, refined and fed to research). The DEV-431 description called the notes editor "existing" — it is **not**; only create-time notes existed, so the FE adds `useDonorHandle` + `updateDonorHandle` (`PATCH /handles/:id`). Always qualify which text is meant.
- "Karma domain" is ambiguous three ways: the **canonical host** (`www.karmahq.org`, the only host serving 200s), the **apex** (`karmahq.org`, an alias that 308s), and the **registrable domain** (`karmahq.org`, used for host construction and for `DOMAIN_CONFIGS` matching). Before the Aug 2026 TLD flip, seven different places in this repo disagreed about which one to emit — `SITE_URL` and `proxy.ts` said `www`, while `envVars.VERCEL_URL`, `getBaseUrl()`, `getDefaultSharedDomain()`, `useInviteUrl` and `SOCIALS.WEBSITE` said apex, and one admin preview fell back to `gap.karmahq.xyz`. Resolved: `utilities/domains.ts` is the single source; `CANONICAL_ORIGIN` for production-pinned links, `appOrigin()` for environment-aware ones, `ROOT_DOMAIN` / `CANONICAL_HOST` when a bare hostname is displayed rather than linked.
- `envVars.VERCEL_URL` never read `process.env.VERCEL_URL` — it was a ternary on `NEXT_PUBLIC_ENV`. Renamed to `envVars.APP_ORIGIN` in Aug 2026. `process.env.VERCEL_URL` (the genuine Vercel-provided variable) is still used in `utilities/fetchFromServer.ts` and declared in `utilities/env.schema.ts`; those are unrelated.
- "Geography": the report-create form's `geography` is a **free-text** field the backend resolver maps to a radius enum (`city|metro|regional|state|national|unknown`). Persona only stores the coarse `geoRadius` (`local|regional|national`). Prefill writes the **resolver-enum token** into the free-text field (`local→metro`, since persona carries no city name), not the raw persona enum.
