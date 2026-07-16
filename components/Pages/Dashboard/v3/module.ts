import type React from "react";
import type { ModuleStatus, ModuleSummary } from "./primitives";

/**
 * Every module key the dashboard can render, gated or not. A `/dashboard/[key]`
 * outside this set is a genuine 404; a key inside it that the user isn't gated
 * for is a redirect back to the overview (see the drill-in route).
 */
export const DASHBOARD_MODULE_KEYS = [
  "advisor",
  "projects",
  "reviews",
  "communities",
  "applications",
] as const;

export type DashboardModuleKey = (typeof DASHBOARD_MODULE_KEYS)[number];

/**
 * A dashboard role module. The orchestrator builds one per active role and
 * hands them to the bento overview, which renders a summary tile per module
 * and the full `render()` view on drill-in.
 */
export interface DashModule {
  key: string;
  label: string;
  /** Design icon name (see SoftIcon), e.g. "compass" | "rocket" | "eye". */
  icon: string;
  /** Feature (brand-tinted) tile — the advisor / research module. */
  brand?: boolean;
  status: ModuleStatus;
  summary?: ModuleSummary;
  onRetry?: () => void;
  /** Copy + primary CTA shown on the empty tile. */
  empty: {
    prompt: string;
    cta: { label: string; icon?: string };
  };
  /** Full drill-in view. */
  render: () => React.ReactNode;
}
