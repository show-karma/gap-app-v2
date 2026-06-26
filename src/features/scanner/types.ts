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
  // R12 wants a 1-line summary per category. Backend does not yet emit it;
  // the FE renders the category name as a label until it lands.
  readonly summary?: string | null;
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
// app/modules/v2/api/scanner/v1/dto/scanner/scorecard.response.ts. The
// R12 fields that backend doesn't emit yet (orgName, url, status,
// rubricVersion, scan timestamps) are listed as optional so the UI can
// render them when the backend ships them.
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
  // Optional R12 fields (not yet emitted by backend; see TODO above).
  readonly orgName?: string | null;
  readonly url?: string;
  readonly status?: ScanStatus;
  readonly rubricVersion?: string;
  readonly startedAt?: string;
  readonly finishedAtConfig?: string | null;
  readonly finishedAtComplete?: string | null;
}

export interface DetailScorecardPayload extends PublicScorecardPayload {
  readonly viewerIsOwner: boolean;
  readonly topFixes?: readonly ScanFix[];
  readonly evidence?: readonly CheckEvidence[];
  readonly walkthroughNotes?: string | null;
  readonly targetUrl?: string;
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
  readonly email: string;
  readonly orgName?: string;
  readonly message: string;
  readonly scanId?: string;
}

export interface ScannerApiKey {
  readonly id: string;
  readonly prefix: string;
  readonly name: string;
  readonly scopes: readonly string[];
  readonly createdAt: string;
  readonly lastUsedAt: string | null;
  readonly revokedAt: string | null;
}

export interface IssueScannerApiKeyRequest {
  readonly name: string;
  readonly scopes?: readonly string[];
}

export interface IssuedScannerApiKey {
  readonly key: string;
  readonly record: ScannerApiKey;
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
