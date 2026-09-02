/**
 * Analytics event catalog — the single source of truth for every event the
 * app sends to Mixpanel.
 *
 * Rules (enforced by the `track()` signature and `scripts/check-anti-patterns.sh`):
 *   - Event names are `object_action` snake_case.
 *   - A `_started` leg exists only where intent measurably precedes completion:
 *     multi-step or wallet-signing flows (project create, application, donation,
 *     scanner scan, onboarding). A single-submit form — adding a grant,
 *     completing or editing a milestone — gets `_completed` / `_failed` only,
 *     because a `_started` fired on the same click carries no drop-off signal.
 *   - One-shot UI actions are a single event.
 *   - Properties are snake_case and never carry PII. Email and wallet addresses
 *     belong on the user *profile* (see `identifyUser` in `client.ts`), not on
 *     events. `redactSensitiveProps` drops anything PII-shaped at runtime, so a
 *     property named `*token*`, `*wallet*`, `*address*`, `*email*`, `*phone*` or
 *     `*secret*` will silently never arrive — name properties accordingly
 *     (`currency`, not `token`).
 *   - Adding an event means adding it here first. `track("free_string")` does
 *     not compile, and the anti-pattern script rejects raw `mixpanel.track`.
 *
 * The human-readable plan for THIS catalog (what each event means, which funnel
 * board it feeds) lives in `docs/analytics/tracking-plan.md` in this repo. The
 * server catalog — the events a browser cannot witness — has its own, in
 * `gap-indexer/docs/analytics/server-events.md`. Keep each in sync with its
 * catalog; a test in each repo enforces it.
 */

/**
 * A stable UI surface a flow can be launched from.
 *
 * Closed on purpose. A bare `string` here is how `entry_point` becomes a
 * hundred near-duplicate values that no report can group by — and how a raw
 * pathname, ids and all, ends up in the dashboard.
 */
export type EntryPointSurface =
  | "project_dialog"
  | "my_projects"
  | "scanner_submit_form"
  | "scanner_site_no_report"
  | "donation_checkout"
  | "donation_onramp"
  /**
   * The sign-in entry. Reserved rather than in use: threading real surface ids
   * through `useAuth`'s ~100 call sites is a separate change, and keeping the
   * union closed is what makes that change type-checked instead of free-form.
   */
  | "navbar";

/**
 * Where a flow was launched from. Either a named surface, or — for callers that
 * cannot name theirs yet — the route family they were on, which is bounded and
 * carries no identifiers. The `route:` prefix keeps the two visibly distinct in
 * a report rather than silently mixing named surfaces with page names.
 */
export type EntryPoint = EntryPointSurface | `route:${string}`;

/** Runtime companion to `EntryPointSurface`, for validating an untyped caller. */
export const ENTRY_POINT_SURFACES = [
  "project_dialog",
  "my_projects",
  "scanner_submit_form",
  "scanner_site_no_report",
  "donation_checkout",
  "donation_onramp",
  "navbar",
] as const satisfies readonly EntryPointSurface[];

/** Prefix marking an entry point derived from the route rather than named. */
export const ROUTE_ENTRY_POINT_PREFIX = "route:";

export type AuthMethod = "email" | "google" | "wallet" | "farcaster" | "unknown";

export type LogoutReason =
  | "user"
  | "wallet_disconnect"
  | "cross_tab"
  | "user_switch"
  /** The session was torn down so wagmi could re-attach the external wallet. */
  | "wallet_reconnect";

type ApplicationCommentTargetType = "application" | "grant" | "report";

type ScannerScorecardVariant = "public" | "detail";

type OnboardingStep = "welcome" | "project" | "grants" | "updates-milestones" | "structure";

/** Shared shape for the `_failed` leg of every triad. */
interface FailureProps {
  /** Stable machine code (HTTP status, SDK error name, or domain error code). Never the message. */
  error_code: string;
}

export interface AnalyticsEventMap {
  // ---------------------------------------------------------------- identity
  login_started: { entry_point: EntryPoint };
  login_completed: {
    auth_method: AuthMethod;
    is_new_user: boolean;
    /**
     * Privy's `wasAlreadyAuthenticated`: `login()` was invoked while the user
     * was already authenticated, so the callback fired without a real sign-in.
     * NOT a session-restore flag — a reload into an existing session does not
     * fire this event at all.
     */
    was_already_authenticated: boolean;
  };
  logout: { reason: LogoutReason };

  // ----------------------------------------------------------------- project
  project_create_started: { entry_point: EntryPoint };
  project_create_completed: {
    project_id: string;
    chain_id: number;
    has_grants_prefilled: boolean;
  };
  project_create_failed: FailureProps & { chain_id: number | null };
  project_edited: { project_id: string; fields_changed: string[] };
  project_update_posted: {
    project_id: string;
    has_deliverables: boolean;
    word_count: number;
  };
  project_update_failed: FailureProps & { project_id: string };
  project_endorsed: { project_id: string; endorser_is_member: boolean };
  project_merged: { source_project_id: string; target_project_id: string };

  // ------------------------------------------------------- grants/milestones
  grant_added_completed: {
    project_id: string;
    grant_id: string;
    community_id: string | null;
    program_id: string | null;
    milestones_count: number;
  };
  grant_added_failed: FailureProps & { project_id: string; community_id: string | null };
  grant_update_posted: { grant_id: string; community_id: string | null };
  milestone_created: { grant_id: string | null; project_id: string; has_due_date: boolean };
  milestone_completed: {
    milestone_id: string;
    grant_id: string | null;
    /** Negative = completed before the due date. Null when there is no due date. */
    days_vs_due_date: number | null;
    has_proof: boolean;
  };
  milestone_completion_failed: FailureProps & { milestone_id: string };
  /**
   * `verifier_role` is not carried: the verification hook is shared by the
   * admin review screen and the inbox, and neither passes a role down. The
   * verifier's own role is on their Mixpanel profile.
   */
  milestone_verified: { milestone_id: string };
  milestone_edit_requested: { milestone_id: string; fields_changed: string[] };
  milestone_edit_completed: { milestone_id: string; fields_changed: string[] };
  milestone_edit_failed: FailureProps & { milestone_id: string };
  milestone_delete_requested: { milestone_id: string };
  milestone_delete_completed: { milestone_id: string };
  milestone_delete_failed: FailureProps & { milestone_id: string };
  milestone_cancel_completed: { milestone_id: string };
  milestone_uncancel_completed: { milestone_id: string };

  // --------------------------------------------------------- funding platform
  application_started: {
    program_id: string;
    community_id: string;
    /**
     * Whether the applicant was signed in when the form opened. Replaces the
     * originally-planned `has_project`: the apply page cannot know whether the
     * visitor owns a Karma project without an extra request made purely for
     * analytics, and an unauthenticated visitor never has one anyway.
     */
    is_authenticated: boolean;
  };
  application_submitted: {
    program_id: string;
    community_id: string;
    /** Seconds from `application_started` in the same page session; null if unknown. */
    time_to_submit_s: number | null;
  };
  application_submit_failed: FailureProps & { program_id: string };
  post_approval_submitted: { application_id: string; program_id: string };
  post_approval_submit_failed: FailureProps & { application_id: string; program_id: string };
  /**
   * `from` and `actor_role` are not carried: the status write goes through one
   * service call shared by four screens, none of which hand it the previous
   * status, and the actor's role is on their Mixpanel profile. The transition
   * itself is reconstructable from the application's own status history.
   */
  application_status_changed: { application_id: string; to: string };
  reviewer_assigned: {
    /** The assignment is per application; the hook that performs it has no program id. */
    application_id: string;
    reviewer_type: "app" | "milestone";
    reviewer_count: number;
  };
  comment_posted: {
    target_type: ApplicationCommentTargetType;
    is_public: boolean;
    is_reply: boolean;
  };

  // --------------------------------------------------------------- donations
  /**
   * The donation cart is not scoped to a community and the app holds no USD
   * conversion client-side, so these carry the checkout's own shape rather than
   * a `community_id` / `total_usd` the frontend would have to invent.
   */
  donation_started: {
    project_count: number;
    entry_point: EntryPoint;
    used_onramp: boolean;
  };
  donation_completed: {
    project_count: number;
    /** ERC-20 symbols paid in. Named `currencies` — the PII guard drops `token`. */
    currencies: string[];
    chain_ids: number[];
    used_onramp: boolean;
  };
  donation_failed: FailureProps & { project_count: number; used_onramp: boolean };

  // --------------------------------------------------------------- discovery
  search_performed: {
    query_length: number;
    results_count: number | null;
    surface: string;
  };
  funding_map_viewed: { has_filters: boolean; results_count: number | null };
  funding_map_filter_applied: {
    filter_type: "status" | "category" | "type" | "karma_only";
    value: string | boolean;
  };
  funding_map_filters_cleared: Record<string, never>;
  funding_map_searched: { query_length: number };
  funding_map_search_cleared: Record<string, never>;
  funding_map_quick_category_clicked: { category: string };
  funding_map_page_changed: { page: number };
  funding_map_show_all_clicked: Record<string, never>;
  funding_map_card_clicked: { program_id: string; position: number | null };
  funding_map_details_opened: { program_id: string };
  funding_map_details_closed: { program_id: string; open_duration_s: number | null };
  funding_map_apply_clicked: { program_id: string; apply_target: "internal" | "external" };
  funding_map_claim_program_clicked: { program_id: string };
  funding_map_bug_bounty_clicked: { program_id: string };
  funding_map_social_link_clicked: { program_id: string; network: string };
  funding_map_submit_program_clicked: Record<string, never>;
  funding_map_create_profile_clicked: Record<string, never>;
  funding_map_agent_tab_clicked: { tab: string };
  funding_map_agent_prompt_copied: {
    program_id: string | null;
    /**
     * False when the clipboard API rejected — the copy affordance is the whole
     * point of the agent card, so a silent failure has to be visible in the
     * report rather than looking like a successful copy.
     */
    copied: boolean;
  };
  funding_map_empty_results: { has_filters: boolean; query_length: number };
  funding_map_load_error: FailureProps;

  scanner_scan_submitted: { entry_point: EntryPoint };
  scanner_scan_completed: { scan_id: string; grade: string | null; total_score: number | null };
  scanner_scan_failed: FailureProps;
  scanner_scorecard_viewed: {
    variant: ScannerScorecardVariant;
    scan_id: string | null;
    grade: string | null;
    total_score: number | null;
    viewer_is_owner: boolean;
    viewer_is_authenticated: boolean;
  };

  report_shared: { report_id: string; share_type: "token" | "link" };
  report_exported: { report_id: string; format: string };
  ask_karma_message_sent: { persona: string | null; message_index: number };

  // -------------------------------------------------------------- onboarding
  onboarding_started: { entry_point: EntryPoint };
  onboarding_step_viewed: { step: OnboardingStep };
  /** Closed BEFORE the last step — a drop-off, and `step` is where it stopped. */
  onboarding_dismissed: { step: OnboardingStep };
  /**
   * Closed ON the last step: the walkthrough was seen through to the end.
   *
   * Carries no `step` because there is only one it can be. Splitting this out
   * of `onboarding_dismissed` is what makes the activation board readable —
   * every finished walkthrough was counted as a drop-off before, so the funnel
   * showed nobody completing it.
   */
  onboarding_completed: Record<string, never>;

  // ------------------------------------------------------------- acquisition
  ai_referral_landing: {
    ai_source: string;
    ai_source_medium: string;
    ai_landing_path: string;
  };
}

export type AnalyticsEventName = keyof AnalyticsEventMap;

export type AnalyticsEventProps<TName extends AnalyticsEventName> = AnalyticsEventMap[TName];

/**
 * Compile-time list of every event name, useful for docs generation and the
 * catalog/tracking-plan sync test. Kept as a runtime array so a test can assert
 * that `docs/analytics/tracking-plan.md` documents each one.
 */
export const ANALYTICS_EVENT_NAMES = [
  "login_started",
  "login_completed",
  "logout",
  "project_create_started",
  "project_create_completed",
  "project_create_failed",
  "project_edited",
  "project_update_posted",
  "project_update_failed",
  "project_endorsed",
  "project_merged",
  "grant_added_completed",
  "grant_added_failed",
  "grant_update_posted",
  "milestone_created",
  "milestone_completed",
  "milestone_completion_failed",
  "milestone_verified",
  "milestone_edit_requested",
  "milestone_edit_completed",
  "milestone_edit_failed",
  "milestone_delete_requested",
  "milestone_delete_completed",
  "milestone_delete_failed",
  "milestone_cancel_completed",
  "milestone_uncancel_completed",
  "application_started",
  "application_submitted",
  "application_submit_failed",
  "post_approval_submitted",
  "post_approval_submit_failed",
  "application_status_changed",
  "reviewer_assigned",
  "comment_posted",
  "donation_started",
  "donation_completed",
  "donation_failed",
  "search_performed",
  "funding_map_viewed",
  "funding_map_filter_applied",
  "funding_map_filters_cleared",
  "funding_map_searched",
  "funding_map_search_cleared",
  "funding_map_quick_category_clicked",
  "funding_map_page_changed",
  "funding_map_show_all_clicked",
  "funding_map_card_clicked",
  "funding_map_details_opened",
  "funding_map_details_closed",
  "funding_map_apply_clicked",
  "funding_map_claim_program_clicked",
  "funding_map_bug_bounty_clicked",
  "funding_map_social_link_clicked",
  "funding_map_submit_program_clicked",
  "funding_map_create_profile_clicked",
  "funding_map_agent_tab_clicked",
  "funding_map_agent_prompt_copied",
  "funding_map_empty_results",
  "funding_map_load_error",
  "scanner_scan_submitted",
  "scanner_scan_completed",
  "scanner_scan_failed",
  "scanner_scorecard_viewed",
  "report_shared",
  "report_exported",
  "ask_karma_message_sent",
  "onboarding_started",
  "onboarding_step_viewed",
  "onboarding_dismissed",
  "onboarding_completed",
  "ai_referral_landing",
] as const satisfies readonly AnalyticsEventName[];

// Compile-time guard: the array above must list every key of the map. If a
// key is added to the map but not the array, `MissingFromList` is a non-never
// type and the assignment below fails to compile.
type MissingFromList = Exclude<AnalyticsEventName, (typeof ANALYTICS_EVENT_NAMES)[number]>;
const _assertCatalogComplete: MissingFromList extends never ? true : never = true;
void _assertCatalogComplete;
