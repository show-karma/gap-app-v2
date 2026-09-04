import { DonorResearchSectionLayout } from "@/src/features/donor-research/components/common/donor-research-section-layout";

/**
 * Onboarding: gated like the advisor routes, but full-screen. It creates the
 * advisor row for the signed-in Privy user, so it must stay behind the sign-in
 * gate -- without it the advisor query threw a 401 into the error boundary and
 * the user saw a second, differently-worded sign-in screen. It brings its own
 * chrome, so it renders outside the advisor shell.
 */
export default function DonorResearchGatedFullscreenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DonorResearchSectionLayout mode="gated-fullscreen">{children}</DonorResearchSectionLayout>
  );
}
