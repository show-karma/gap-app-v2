"use client";

import { useOwnerStore, useProjectStore } from "@/store";

/**
 * Whether the current user may edit/delete project content (milestones,
 * updates, impact) on the project profile.
 *
 * Centralizes the three ownership signals that must stay in sync across every
 * project view. Keeping them in one place prevents the drift that previously
 * hid edit/delete controls from legitimate project owners:
 * - `isOwner`        — global EAS resolver super-admin (not the project owner)
 * - `isProjectAdmin` — on-chain `isAdmin()` result (no linked-wallet fallback)
 * - `isProjectOwner` — ownership resolved via `compareAllWallets`, covering
 *   email/embedded-wallet owners and multi-wallet accounts
 */
export function useProjectAuthorization(): boolean {
  const isOwner = useOwnerStore((state) => state.isOwner);
  const isProjectAdmin = useProjectStore((state) => state.isProjectAdmin);
  const isProjectOwner = useProjectStore((state) => state.isProjectOwner);
  return isOwner || isProjectAdmin || isProjectOwner;
}
