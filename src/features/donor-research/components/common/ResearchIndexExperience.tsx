"use client";

import { useEffect } from "react";
import { useLoadPrivy, usePrivyBridge } from "@/contexts/privy-bridge-context";
import { DonorResearchHome } from "./DonorResearchHome";
import { DonorResearchShell } from "./DonorResearchShell";
import { DonorResearchSignInGate } from "./DonorResearchSignInGate";

/**
 * Client experience for the public /nonprofit-research index.
 *
 * The section layout no longer auth-gates this one route (so the page's
 * server-rendered FAQ content can exist in the HTML for crawlers and
 * signed-out visitors); this component restores the exact per-state UI
 * the layout used to provide:
 *
 * - Privy still resolving → the gate's loading skeleton
 * - signed out           → the sign-in gate (public FAQ renders below it)
 * - signed in            → the advisor shell + research home, as before
 *
 * Auth posture is unchanged: every advisor query still runs only inside
 * the signed-in branch, and all other donor-research routes remain gated
 * by the layout.
 */
export function ResearchIndexExperience() {
  const { ready, authenticated } = usePrivyBridge();
  const loadPrivy = useLoadPrivy();

  useEffect(() => {
    loadPrivy();
  }, [loadPrivy]);

  if (!ready) {
    return <DonorResearchSignInGate isLoading />;
  }

  if (!authenticated) {
    return <DonorResearchSignInGate />;
  }

  return (
    <DonorResearchShell>
      <DonorResearchHome />
    </DonorResearchShell>
  );
}
