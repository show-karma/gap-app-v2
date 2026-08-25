"use client";

import "./v3/dashboard-soft.css";
import { GettingStartedView } from "./v3/GettingStartedView";
import { SoftShell } from "./v3/SoftShell";

/**
 * Static preview of the dashboard's empty (no-data) state — the same
 * getting-started view a brand-new user sees when they match none of the role
 * modules. No auth/data required. Reachable at /empty-dashboard.
 */
export function EmptyDashboardPreview() {
  return (
    <SoftShell>
      <GettingStartedView />
    </SoftShell>
  );
}
