"use client";

import { createContext, useContext } from "react";
import { DashboardLoading } from "./DashboardLoading";
import { type DashboardModulesState, useDashboardModules } from "./useDashboardModules";
import "./v3/dashboard-soft.css";
import { WarnBar } from "./v3/primitives";
import { SoftShell } from "./v3/SoftShell";

const DashboardContext = createContext<DashboardModulesState | null>(null);

/**
 * Read the shared dashboard state (modules + gating) inside the `/dashboard`
 * route tree. Only valid under `DashboardProvider` (i.e. once auth + data have
 * resolved), so it never returns loading/undecided state.
 */
export function useDashboardContext(): DashboardModulesState {
  const ctx = useContext(DashboardContext);
  if (!ctx) {
    throw new Error("useDashboardContext must be used within <DashboardProvider>");
  }
  return ctx;
}

/**
 * Layout-level provider for the `/dashboard` route tree. Runs the data/role
 * orchestration ONCE and holds the `SoftShell` chrome, so navigating between
 * the overview (`/dashboard`) and a drill-in (`/dashboard/[module]`) neither
 * refetches nor re-mounts the shell — App Router keeps the layout mounted
 * across child-segment navigations.
 *
 * Children (the overview / drill-in pages) only render once authenticated and
 * resolved; until then this shows the full-page skeleton.
 */
export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const state = useDashboardModules();

  if (!state.authenticated || state.isLoading) {
    return <DashboardLoading />;
  }

  return (
    <SoftShell address={state.address}>
      {state.isGuestDueToError ? (
        <WarnBar>
          We couldn&apos;t verify your permissions. Some sections may be hidden — try refreshing.
        </WarnBar>
      ) : null}
      <DashboardContext.Provider value={state}>{children}</DashboardContext.Provider>
    </SoftShell>
  );
}
