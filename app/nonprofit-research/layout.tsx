"use client";

import { PermissionProvider } from "@/src/core/rbac/context/permission-context";

/**
 * Donor-research section layout (U12).
 *
 * Wraps the section in the global `PermissionProvider` (same posture as
 * `/dashboard`) so any nested permission hooks resolve cleanly. The
 * donor-research feature does not use community-scoped RBAC — every
 * route is owner-scoped on the advisor row, so the read services in the
 * indexer enforce tenant isolation rather than the frontend's
 * `useReviewerPrograms` style detection.
 */
export default function DonorResearchLayout({ children }: { children: React.ReactNode }) {
  return <PermissionProvider>{children}</PermissionProvider>;
}
