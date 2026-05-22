import type { Metadata } from "next";
import { LandingPageDynamic } from "@/src/features/non-profits/components/landing-page-dynamic";
import { customMetadata } from "@/utilities/meta";

export const metadata: Metadata = customMetadata({
  title: "Grow Nonprofits — Find Philanthropic Funding",
  description:
    "Search thousands of foundations, grants, and nonprofits with AI-powered discovery. Find the right funders for your mission.",
  path: "/non-profits",
});

export default function NonProfitsPage() {
  return <LandingPageDynamic />;
}
