/**
 * Donor-research API response types, mirroring the gap-indexer DTOs from
 * Phase A+B. Kept narrow — types describe only what the frontend consumes
 * from the wire, not the full domain model.
 */

export type DonorResearchRateLimitTier = "beta" | "standard" | "unlimited";

export type DonorResearchReportMode = "fast" | "deep";

export type DonorResearchReportStatus =
  | "pending"
  | "running_fast"
  | "fast_complete"
  | "enriching"
  | "re_enriching"
  | "complete"
  | "failed";

export type ComplianceVerdictKind = "verified" | "partial" | "flagged" | "disqualified";

export type ActivitySignalStatus = "ok" | "partial" | "scrape_failed" | "no_signal";

export type StateRegistrationStatus =
  | "verified"
  | "suspended"
  | "revoked"
  | "not_verified"
  | "data_not_yet_indexed";

export interface DonorAdvisor {
  id: string;
  privyUserId: string;
  displayName: string;
  orgName: string | null;
  timezone: string;
  rateLimitTier: DonorResearchRateLimitTier;
  createdAt: string;
  updatedAt: string;
}

export interface DonorResearchCounterChannel {
  used: number;
  cap: number | null;
}

export interface DonorResearchCountersSnapshot {
  advisorId: string;
  tier: DonorResearchRateLimitTier;
  fast: DonorResearchCounterChannel;
  deep: DonorResearchCounterChannel;
  resetsAt: string;
  degraded: boolean;
}

export interface DonorHandle {
  id: string;
  advisorId: string;
  opaqueLabel: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DonorHandleList {
  items: DonorHandle[];
  limit: number;
  offset: number;
}

export interface ResearchReportListItem {
  id: string;
  donorHandleId: string;
  /**
   * Opaque label the advisor set for the donor on this report
   * (e.g. "Smith Family Q3"). Null when the handle row has gone
   * missing — typically only during partial backfills.
   */
  donorHandleLabel: string | null;
  criteriaId: string;
  /**
   * Word-boundary truncated preview of the criteria text the
   * advisor submitted, capped at ~240 chars on the wire. Null when
   * the criteria row has gone missing.
   */
  criteriaSummary: string | null;
  mode: DonorResearchReportMode;
  status: DonorResearchReportStatus;
  hasShareToken: boolean;
  shareTokenExpiresAt: string | null;
  createdAt: string;
  fastCompletedAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
}

export interface ResearchReportList {
  items: ResearchReportListItem[];
  limit: number;
  offset: number;
}

export type ComplianceDisqualificationReason =
  | "pub78_revoked"
  | "ca_ag_suspended"
  | "ca_ag_revoked"
  | "no_recent_990"
  | "governance_red_flag";

export type ComplianceCheckName = "pub78" | "recent_990" | "ca_ag" | "governance";

export type ComplianceCheckStatus = "passed" | "failed" | "not_applicable" | "unknown";

export interface ComplianceCheck {
  name: ComplianceCheckName;
  label: string;
  status: ComplianceCheckStatus;
  detail: string;
}

/**
 * One validated mention of the nonprofit on its own site or in
 * external news/coverage. Powers the "Recent activity" section on
 * the candidate card.
 */
export type RecentMentionKind = "own_domain" | "external_mention";

export interface RecentMention {
  kind: RecentMentionKind;
  url: string;
  title: string | null;
  publisher: string | null;
  publishedDate: string | null;
  matchScore: number;
  matchSignals: string[];
}

/**
 * Snapshot of how the orchestrator interpreted the freeform geography
 * input. Lets the report viewer show "filter not applied" warnings
 * when the LLM couldn't confidently map the input to a US locale.
 */
export interface GeographyDiagnostic {
  inputGeography: string | null;
  resolvedStates: string[];
  resolvedCities: string[];
  radius: "city" | "metro" | "regional" | "state" | "national" | "unknown";
  confidence: number;
  cached: boolean;
}

/**
 * One year of IRS-990 financials for a candidate, as surfaced on the
 * candidate card's "Financials (last 3 years)" table. Each figure is a
 * plain USD amount; `null` means the value was absent from the filing.
 */
export interface CandidateFinancialYear {
  year: number;
  income: number | null;
  expenses: number | null;
  assets: number | null;
}

export type SocialChannel = "linkedin" | "facebook" | "instagram" | "x";

export interface SocialChannelMetric {
  channel: SocialChannel;
  /** False = no handle for this channel, or the fetch did not resolve. */
  available: boolean;
  followers: number | null;
  /** Posts in the trailing 60-day window. */
  postsInWindow: number;
  lastPostAt: string | null;
  avgLikes: number | null;
  /** Public profile URL, when known — makes the channel row a link. */
  profileUrl?: string | null;
}

/**
 * Per-channel social-activity snapshot captured at report time (DEV-385).
 * `null` for candidates with no social data persisted.
 */
export interface SocialMetrics {
  byChannel: SocialChannelMetric[];
  /** Most recent post across all channels. */
  lastPostAt: string | null;
  /** Sum of non-null follower counts across channels. */
  totalFollowers: number | null;
}

/**
 * Composite-ranking weights as basis points (DEV-418). Each dimension is an
 * integer 0–10000 and the five sum to exactly 10000. Mirrors the persisted
 * backend shape; `ResearchReportDetail.weights` is `null` on legacy reports
 * (created before DEV-418), which the UI reads as "hide the weights panel and
 * render the four-row methodology".
 */
export interface CompositeWeights {
  onlinePresence: number;
  socialPresence: number;
  impactRecency: number;
  donorMatch: number;
  compliance: number;
}

export interface ResearchReportCandidate {
  id: string;
  fundingOrganizationId: string;
  organizationName: string | null;
  organizationDescription: string | null;
  organizationCity: string | null;
  organizationState: string | null;
  organizationWebsiteUrl: string | null;
  ein: string | null;
  composite: number;
  /**
   * Per-dimension component scores, each in `[0, 1]`. DEV-418 split the
   * legacy `freshness` (website + social bundled) into website-only
   * `onlinePresence` and SociaVault-fed `socialPresence`. New reports carry
   * `onlinePresence` + `socialPresence` and omit `freshness`; legacy reports
   * carry `freshness` and omit the two split fields. Branch on the report's
   * `weights` (null => legacy) to know which shape to expect.
   */
  components: {
    freshness?: number;
    onlinePresence?: number;
    socialPresence?: number;
    impactRecency: number;
    donorMatch: number;
    compliance: number;
  };
  /**
   * True for the candidates in the featured set — the top `report.topCount`
   * candidates, which receive the AI one-pager (DEV-418). Renamed from
   * `topThreeFlag` now that the featured-set size is advisor-configurable.
   */
  featuredFlag: boolean;
  /**
   * Advisor-forced display position (DEV-418 manual reorder), 1-based.
   * `null` when ordering derives from the composite score. A weights
   * re-rank resets this to `null` (one source of truth at a time).
   */
  manualPosition: number | null;
  complianceVerdict: ComplianceVerdictKind;
  disqualificationReasons: ComplianceDisqualificationReason[];
  complianceChecks: ComplianceCheck[];
  recentMentions: RecentMention[];
  stateRegistrationStatus: StateRegistrationStatus;
  activitySignalStatus: ActivitySignalStatus;
  websiteLastUpdatedAt: string | null;
  socialLastPostAt: string | null;
  /**
   * Per-channel social-activity snapshot (followers, posts-in-60d, last
   * post, avg likes). `null` for candidates predating the social signal
   * or with no social data.
   */
  socialMetrics: SocialMetrics | null;
  reasoningSummary: string | null;
  onePagerText: string | null;
  detailedText: string | null;
  /**
   * Up to three years of IRS-990 financials, ordered most-recent year
   * first. Empty when the org has no indexed 990 financials.
   */
  financials: CandidateFinancialYear[];
}

export interface CriteriaSnapshot {
  criteriaText: string;
  cause: string | null;
  geography: string | null;
  amountMin: number | null;
  amountMax: number | null;
}

export interface ResearchReportDetail {
  id: string;
  advisorId: string;
  donorHandleId: string;
  donorHandleLabel: string | null;
  criteriaId: string;
  /**
   * Snapshot of the criteria the report was generated from. Null when
   * the criteria row is unrecoverable; otherwise carries the full text
   * + structured fields so the brief can render a "Query" disclosure.
   */
  criteria: CriteriaSnapshot | null;
  mode: DonorResearchReportMode;
  status: DonorResearchReportStatus;
  hasShareToken: boolean;
  shareToken: string | null;
  shareTokenExpiresAt: string | null;
  errorMessage: string | null;
  createdAt: string;
  fastCompletedAt: string | null;
  completedAt: string | null;
  geographyDiagnostic: GeographyDiagnostic | null;
  /**
   * Advisor-configured composite-ranking weights (DEV-418), basis points
   * summing to 10000. `null` marks a legacy report scored with the fixed
   * four-dimension weights — the frontend hides the weights panel and
   * renders the legacy methodology when this is absent.
   */
  weights: CompositeWeights | null;
  /**
   * Size of the featured set that receives an AI one-pager (DEV-418),
   * advisor-configurable 1–25. `null` marks a report from before this shipped
   * — the frontend treats it as the original default of 3.
   */
  topCount: number | null;
  candidates: ResearchReportCandidate[];
}

export interface ReportCreateResponse {
  reportId: string;
  status: DonorResearchReportStatus;
  streamUrl: string;
}

export interface ShareTokenPayload {
  id: string;
  shareToken: string | null;
  shareTokenExpiresAt: string | null;
  shareDisplayName: string | null;
  shareIntroText: string | null;
  shareUrlPath: string;
}

/**
 * Wire shape of the unauthenticated donor share endpoint
 * (`GET /v2/donor-research/shared/:token`). It returns ONLY the fields the
 * brief renders — no advisor identifiers, no internal IDs, and no share-token
 * material. `fetchSharedReport` adapts this into a {@link ResearchReportDetail}
 * (filling inert defaults for the advisor-only fields) so the donor share view
 * renders the exact same brief as the advisor report.
 */
export type SharedReportApiPayload = Omit<
  ResearchReportDetail,
  | "advisorId"
  | "donorHandleId"
  | "donorHandleLabel"
  | "criteriaId"
  | "criteria"
  | "hasShareToken"
  | "shareToken"
  | "shareTokenExpiresAt"
>;

export interface FastReportEvent {
  name:
    | "snapshot"
    | "pool_loaded"
    | "compliance_complete"
    | "contact_discovery_complete"
    | "activity_complete"
    | "ranking_complete"
    | "report_finalized"
    | "report_failed";
  reportId: string;
  data: Record<string, unknown>;
}

// -- Donor persona (DEV-431) -------------------------------------------
//
// A 1:1 record per donor handle: a free-text source the advisor writes,
// an LLM-refined narrative, and five structured enum chips — each chip
// carrying provenance (LLM-`extracted` vs advisor-`manual`). The persona
// is a *default* that prefills the report-create form; it is never written
// back to by the form, and editing it never alters existing reports.

/** Per-chip origin: set by the refine LLM, set by the advisor, or absent. */
export type PersonaProvenance = "extracted" | "manual";

export type OrgMaturity = "upcoming" | "established" | "mixed";
export type GeoRadius = "local" | "regional" | "national";
export type FaithStance = "secular" | "faith_based" | "agnostic";
export type GiftSizeBand = "small_high_leverage" | "mid" | "large_institutional";
export type AdvocacyStance = "funds_advocacy" | "avoids_advocacy";

/**
 * One structured chip: an enum value plus where it came from. Invariant
 * (enforced server-side): `value: null` ⇒ `source: null` — a chip with no
 * value never carries provenance.
 */
export interface PersonaStructuredField<T extends string> {
  value: T | null;
  source: PersonaProvenance | null;
}

export interface PersonaStructured {
  orgMaturity: PersonaStructuredField<OrgMaturity>;
  geoRadius: PersonaStructuredField<GeoRadius>;
  faithStance: PersonaStructuredField<FaithStance>;
  giftSizeBand: PersonaStructuredField<GiftSizeBand>;
  advocacyStance: PersonaStructuredField<AdvocacyStance>;
}

/**
 * The five scoring weights the backend recomputes server-side on every GET
 * from `structured` (the "nudge"). Same five dimensions as
 * {@link CompositeWeights} (basis points, integers summing to 10000). The
 * frontend consumes these verbatim and never mirrors the nudge math.
 */
export type PersonaComputedWeights = CompositeWeights;

export interface DonorPersona {
  id: string;
  donorHandleId: string;
  sourceText: string | null;
  narrative: string | null;
  structured: PersonaStructured;
  computedWeights: PersonaComputedWeights;
  /**
   * Explicit gift amounts (USD) extracted from the source by Refine, used to
   * prefill the report form accurately — NOT derived from `giftSizeBand`.
   * Optional: present only once the backend emits them (gap-indexer#2117).
   * `amountMax: null` means an open-ended upper bound.
   */
  amountMin?: number | null;
  amountMax?: number | null;
  /**
   * Topical cause / focus area extracted from the source (e.g. "climate",
   * "education"), used to prefill the report form's Cause field. Optional:
   * present only once the backend emits it (gap-indexer#2117). `null` when the
   * source names no clear single cause.
   */
  cause?: string | null;
  /**
   * Place string extracted from the source (e.g. "Pacific Northwest"), used to
   * prefill the report form's Geography field — NOT the coarse `geoRadius`
   * enum. Optional: present only once the backend emits it (gap-indexer#2117).
   * `null` when the source names no clear location.
   */
  geography?: string | null;
  refinedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Result of `POST …/persona/refine`. The refine call does NOT persist, so
 * the shape carries no `id`, timestamps, or `computedWeights`. Each chip's
 * `source` is `"extracted"` or `null` — never `"manual"`. Refinement never
 * fabricates: an uncertain field comes back `{ value: null, source: null }`.
 */
export interface RefinementResult {
  narrative: string | null;
  structured: PersonaStructured;
  /**
   * Explicit values extracted from the source. The editor carries these into
   * the persona PUT so they persist (and then prefill the report form). `null`
   * when the source names none. Optional for back-compat with older responses.
   */
  amountMin?: number | null;
  amountMax?: number | null;
  cause?: string | null;
  geography?: string | null;
}
