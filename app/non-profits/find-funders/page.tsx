import type { Metadata } from "next";
import { LandingPageDynamic } from "@/src/features/non-profits/components/landing-page-dynamic";
import { customMetadata } from "@/utilities/meta";

export const metadata: Metadata = customMetadata({
  title: "Karma Find Funders — AI Agents for Funder Research",
  description:
    "Ask an agent: find foundations and grantmaking nonprofits aligned to your mission. Grounded in every IRS 990 on record — every answer cited. Works in Claude and ChatGPT.",
  path: "/non-profits/find-funders",
});

export default function NonProfitsPage() {
  return <LandingPageDynamic />;
}
