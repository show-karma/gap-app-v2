"use client";

import { AccessDenied } from "@/src/components/ui/AccessDenied";

const SIGN_IN_TITLE = "Sign in to access nonprofit research";
const SIGN_IN_MESSAGE =
  "Sign in to create research reports, build donor profiles, interact with donors and nonprofits.";

interface DonorResearchSignInGateProps {
  /** Render the neutral skeleton while Privy is still resolving the session. */
  isLoading?: boolean;
}

/**
 * The one signed-out screen for the whole nonprofit-research section.
 *
 * Every route that can be reached without a session — the layout's auth
 * boundary, onboarding, and the error boundary's auth branch — renders this
 * component, so a visitor sees the same card whether they landed on the
 * section index, deep-linked into onboarding, or had their session expire
 * mid-flow. Previously the error boundary carried its own "Please sign in"
 * card, which meant two different screens for the same user state.
 */
export function DonorResearchSignInGate({ isLoading = false }: DonorResearchSignInGateProps) {
  return (
    <AccessDenied
      compactTitle
      variant="signin"
      isLoading={isLoading}
      title={SIGN_IN_TITLE}
      message={SIGN_IN_MESSAGE}
    />
  );
}
