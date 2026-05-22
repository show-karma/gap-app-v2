import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { customMetadata } from "@/utilities/meta";

export const metadata: Metadata = customMetadata({
  title: "Grant Atlas — Find Philanthropic Funding",
  description:
    "Search thousands of foundations, grants, and nonprofits with AI-powered discovery. Find the right funders for your mission.",
  path: "/non-profits",
});

const LandingPageClient = dynamic(
  () =>
    import("@/src/features/non-profits/components/landing-page-client").then(
      (m) => m.LandingPageClient
    ),
  { ssr: false }
);

export default function NonProfitsPage() {
  return <LandingPageClient />;
}
