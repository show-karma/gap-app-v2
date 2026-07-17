import type { Metadata } from "next";
import { DonorResearchHome } from "@/src/features/donor-research/components/common/DonorResearchHome";
import { customMetadata } from "@/utilities/meta";

export const metadata: Metadata = customMetadata({
  title: "Nonprofit Research",
  description:
    "Research current, ranked nonprofit recommendations for donor personas with compliance verification and live activity signals.",
  path: "/nonprofit-research",
  robots: { index: false, follow: true },
});

export default function Page() {
  return <DonorResearchHome />;
}
