import type { Metadata } from "next";
import { OnboardingFlow } from "@/src/features/donor-research/components/onboarding/OnboardingFlow";
import { customMetadata } from "@/utilities/meta";

export const metadata: Metadata = customMetadata({
  title: "Nonprofit Research — Onboarding",
  description: "Set up your nonprofit-research advisor profile.",
  path: "/nonprofit-research/onboarding",
  robots: { index: false, follow: false },
});

export default function Page() {
  return <OnboardingFlow />;
}
