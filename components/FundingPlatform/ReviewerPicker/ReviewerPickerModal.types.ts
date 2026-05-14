import type {
  CommunityReviewer,
  CommunityReviewerRole,
} from "@/services/community-reviewers/community-reviewers.types";

export type ReviewerRoleSelection = "program" | "milestone";

export function roleSelectionFromCommunityRole(role: CommunityReviewerRole): ReviewerRoleSelection {
  return role === "milestone-reviewer" ? "milestone" : "program";
}

// ─── Role constants ──────────────────────────────────────────────────────────
export const COMMUNITY_REVIEWER_ROLES = {
  PROGRAM: "program-reviewer",
  MILESTONE: "milestone-reviewer",
} as const;

// ─── Row kinds ───────────────────────────────────────────────────────────────

/**
 * A row picked from the community pool.
 * Fields are pre-filled from the pool but may be edited (dirty).
 */
export interface PoolPickedRow {
  kind: "pool";
  id: string; // stable client-side id (publicAddress)
  publicAddress: string;
  name: string;
  email: string;
  telegram: string;
  slack: string;
  /** Roles this reviewer will be granted on save. Multi-select. */
  roles: ReviewerRoleSelection[];
  /** Original values from the pool — used to detect dirty fields. */
  original: {
    name: string;
    email: string;
    telegram: string;
    slack: string;
  };
  error?: string | null;
}

/**
 * A brand-new reviewer row typed in by the admin.
 */
export interface NewRow {
  kind: "new";
  id: string; // stable client-side id (uuid)
  name: string;
  email: string;
  telegram: string;
  slack: string;
  /** Roles this reviewer will be granted on save. Multi-select. */
  roles: ReviewerRoleSelection[];
  error?: string | null;
}

export type SelectedRow = PoolPickedRow | NewRow;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Returns true if any contact field on a pool-picked row differs from original.
 */
export function isRowDirty(row: PoolPickedRow): boolean {
  return (
    row.name !== row.original.name ||
    row.email !== row.original.email ||
    row.telegram !== row.original.telegram ||
    row.slack !== row.original.slack
  );
}

/**
 * Build a PoolPickedRow from a community reviewer, defaulting roles
 * to whichever role launched the picker.
 */
export function poolRowFromReviewer(
  reviewer: CommunityReviewer,
  defaultRole: ReviewerRoleSelection
): PoolPickedRow {
  const telegram = reviewer.telegram ?? "";
  const slack = reviewer.slack ?? "";
  const defaultAsCommunityRole: CommunityReviewerRole =
    defaultRole === "milestone" ? "milestone-reviewer" : "program-reviewer";
  // Prefer the launcher's role when the reviewer already has it; otherwise
  // fall back to the reviewer's existing role so the chip doesn't pre-check
  // a role the reviewer isn't associated with.
  const initialRole: ReviewerRoleSelection = reviewer.roles.includes(defaultAsCommunityRole)
    ? defaultRole
    : reviewer.roles[0]
      ? roleSelectionFromCommunityRole(reviewer.roles[0])
      : defaultRole;
  return {
    kind: "pool",
    id: reviewer.publicAddress,
    publicAddress: reviewer.publicAddress,
    name: reviewer.name,
    email: reviewer.email,
    telegram,
    slack,
    roles: [initialRole],
    original: {
      name: reviewer.name,
      email: reviewer.email,
      telegram,
      slack,
    },
  };
}

/**
 * Build a blank NewRow.
 */
export function emptyNewRow(id: string, defaultRole: ReviewerRoleSelection): NewRow {
  return {
    kind: "new",
    id,
    name: "",
    email: "",
    telegram: "",
    slack: "",
    roles: [defaultRole],
  };
}

// ─── Modal props ─────────────────────────────────────────────────────────────

export interface ReviewerPickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  communityUID: string;
  programId: string;
  reviewerType: "program" | "milestone";
  /** Wallet addresses already assigned to this program — hidden in left pane. */
  assignedAddresses: string[];
  /** Called after a fully-successful save so the parent can refetch/show a toast. */
  onCompleted?: () => void;
  /**
   * Initial mode when the modal opens.
   * - "pool" (default): focus on the community pool / left pane
   * - "addNew": auto-create a blank row on the right pane (skip the pool)
   */
  initialMode?: "pool" | "addNew";
}
