// Wire shapes mirror gap-indexer/app/modules/v2/api/scanner/v1/dto/scanner/*.ts.
// Keep in sync with backend OpenAPI: GET /api/scanner/v1/openapi.json.

export type ScanStatus =
  | "queued"
  | "running_config"
  | "config_complete"
  | "running_agent"
  | "complete"
  | "failed";

export type ScanGrade = "A" | "B" | "C" | "D" | "F";

export type CheckStatus = "pass" | "partial" | "fail" | "not_attempted" | "error";

export interface CategoryScore {
  readonly category: string;
  readonly pointsAwarded: number;
  readonly pointsPossible: number;
  readonly normalizedScore: number;
  readonly pending: boolean;
  // Per-category summary generated server-side from the underlying
  // CheckResults (gates fired > all pass > miss list).
  readonly summary?: string | null;
  // Display label + subtitle from the rubric category metadata.
  // Sourced from the BE so the FE never duplicates the vocabulary.
  readonly label?: string;
  readonly subtitle?: string;
}

export interface ScanFix {
  readonly checkId: string;
  readonly title: string;
  readonly pointsAtStake: number;
  readonly howToFix: string;
}

export interface CheckEvidence {
  readonly checkId: string;
  readonly status: CheckStatus;
  readonly pointsAwarded: number;
  readonly pointsPossible: number;
  readonly summary: string;
  readonly details?: Record<string, unknown>;
}

// Wire shape matches gap-indexer's PublicScorecardResponseSchema in
// app/modules/v2/api/scanner/v1/dto/scanner/scorecard.response.ts.
// The slug endpoint (/api/scanner/v1/s/:slug) always returns a fully
// scored scorecard — required fields are required.
export interface PublicScorecardPayload {
  readonly scanId: string;
  readonly slug: string;
  readonly totalScore: number | null;
  readonly grade: ScanGrade | null;
  readonly categoryScores: readonly CategoryScore[];
  readonly summary: string | null;
  readonly ogImageUrl: string | null;
  readonly unknowns: {
    readonly errorCheckIds: readonly string[];
    readonly pendingCheckIds: readonly string[];
    readonly notAttemptedCheckIds: readonly string[];
  };
  // R12 fields the public scorecard endpoint always emits.
  readonly orgName: string | null;
  readonly url: string;
  readonly status: ScanStatus;
  readonly rubricVersion: string;
  readonly startedAt: string;
  readonly finishedAtConfig: string | null;
  readonly finishedAtComplete: string | null;
}

// Wire shape matches gap-indexer's ScanResponseSchema in
// app/modules/v2/api/scanner/v1/dto/scanner/scan.response.ts.
// The scan-id endpoint (/api/scanner/v1/scans/:id) returns three
// nested tiers: envelope (always present), scorecard (when scored),
// detail (authenticated callers only). Scorecard and detail fields
// are optional here because the BE emits envelope-only for queued
// scans, anonymous callers, and unpublished scorecards. Components
// must guard before reading them.
export interface DetailScorecardPayload {
  readonly scanId: string;
  readonly slug: string;
  readonly targetUrl: string;
  readonly status: ScanStatus;
  readonly viewerIsOwner: boolean;
  // Scorecard tier — present when the scan has been scored and the
  // scorecard is still published. Absent in envelope-only responses.
  readonly totalScore?: number | null;
  readonly grade?: ScanGrade | null;
  readonly rubricVersion?: string;
  readonly categoryScores?: readonly CategoryScore[];
  readonly summary?: string | null;
  readonly ogImageUrl?: string | null;
  readonly orgName?: string | null;
  readonly unknowns?: PublicScorecardPayload["unknowns"];
  readonly url?: string;
  readonly startedAt?: string;
  readonly finishedAtConfig?: string | null;
  readonly finishedAtComplete?: string | null;
  // Detail tier — authenticated callers only.
  readonly topFixes?: readonly ScanFix[];
  readonly evidence?: readonly CheckEvidence[];
  readonly walkthroughNotes?: string | null;
  readonly cta?: {
    readonly sourceTag: "fix-help";
    readonly scanId: string;
    readonly contactUrl: string;
  };
}

export interface SubmitScanRequest {
  readonly url: string;
  readonly ein?: string;
  readonly webhookUrl?: string;
}

export interface SubmitScanResponse {
  readonly scanId: string;
  readonly slug: string;
  readonly publicUrl: string;
  readonly status: ScanStatus;
}

export type ContactSourceTag = "fix-help" | "more-scans" | "api-key-request" | "removal" | "other";

export interface ContactRequest {
  readonly sourceTag: ContactSourceTag;
  // Wire field is `contactEmail` — the backend ContactRequestSchema requires
  // exactly this key (a plain `email` is rejected with a 400 validation error).
  readonly contactEmail: string;
  readonly orgName?: string;
  readonly message: string;
  readonly scanId?: string;
}

export interface ScannerApiError {
  readonly code: string;
  readonly message: string;
  readonly details?: Record<string, unknown>;
}

export const SCANNER_RATE_LIMIT_CODES = {
  anonymous: "anonymous_rate_limit",
  loggedIn: "logged_in_rate_limit",
  sessionRequired: "session_required",
  insufficientScope: "insufficient_scope",
  invalidCursor: "invalid_cursor",
} as const;
