import "@/components/Pages/Dashboard/v3/dashboard-soft.css";

import type { ReactNode } from "react";
import { cn } from "@/utilities/tailwind";

interface TokenPageShellProps {
  children: ReactNode;
  /** Constrains the reading column. Defaults to the section's standard single-column width. */
  maxWidthClassName?: string;
}

/**
 * Minimal `.dashv3`-scoped chrome for the section's standalone, unauthenticated
 * routes — the donor share view, the nonprofit Q&A response page, and
 * onboarding (spec 2.2: "The shell does NOT wrap token pages [...], or
 * onboarding"). These routes render report-brief building blocks (and, for
 * onboarding, the sample report preview) that read the `--sf-*` custom
 * properties `dashboard-soft.css` defines and scopes to `.dashv3` (see
 * `SoftShell`) — so each standalone route needs that same scoping class
 * WITHOUT the advisor rail/nav `DonorResearchShell` renders around it.
 */
export function TokenPageShell({ children, maxWidthClassName = "max-w-5xl" }: TokenPageShellProps) {
  return (
    <main className="dashv3 min-h-screen bg-sf-panel">
      <div className={cn("mx-auto px-4 py-8 sm:px-6 sm:py-10", maxWidthClassName)}>{children}</div>
    </main>
  );
}
