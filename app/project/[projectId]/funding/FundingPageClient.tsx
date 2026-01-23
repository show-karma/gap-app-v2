"use client";

import dynamic from "next/dynamic";
import { ProjectOverviewLoading } from "@/components/Pages/Project/Loading/Overview";

const ProjectFundingPage = dynamic(
  () =>
    import("@/components/Pages/Project/v2/FundingPage/ProjectFundingPage").then(
      (mod) => mod.ProjectFundingPage
    ),
  {
    loading: () => <ProjectOverviewLoading />,
  }
);

/**
 * FundingPageClient is the client-side component for the funding page.
 * It uses dynamic import to load the ProjectFundingPage component with
 * a loading fallback.
 */
export function FundingPageClient() {
  return <ProjectFundingPage />;
}
