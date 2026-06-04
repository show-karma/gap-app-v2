import type { Metadata } from "next";
import { DonorResearchHome } from "@/src/features/donor-research/components/common/DonorResearchHome";
import { customMetadata } from "@/utilities/meta";

export const metadata: Metadata = customMetadata({
  title: "Donor Research",
  description:
    "Research current, ranked nonprofit recommendations for donor clients with compliance verification and live activity signals.",
  path: "/donor-research",
  robots: { index: false, follow: true },
});

export default function Page() {
  return <DonorResearchHome />;
}
