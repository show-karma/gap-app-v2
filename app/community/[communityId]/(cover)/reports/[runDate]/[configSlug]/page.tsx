import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PublicReportViewPage } from "@/components/Pages/Community/PortfolioReports/PublicReportViewPage";
import { communitySubpageMetadata } from "@/utilities/metadata/communityCanonical";
import { CONFIG_SLUG_REGEX, RUN_DATE_REGEX } from "@/utilities/portfolio-reports/period";
import { getCommunityDetails } from "@/utilities/queries/v2/community";
import Loading from "./loading";

interface Props {
  params: Promise<{ communityId: string; runDate: string; configSlug: string }>;
}

// Self-canonical per (run-date, config): a community running two configs on the
// same day has two distinct reports, and each needs its own canonical URL.
// Mirrors the page's validation so an invalid segment never emits a canonical
// for a URL the page 404s.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { communityId, runDate, configSlug } = await params;
  if (!RUN_DATE_REGEX.test(runDate) || !CONFIG_SLUG_REGEX.test(configSlug)) {
    return {};
  }
  return communitySubpageMetadata(communityId, `reports/${runDate}/${configSlug}`);
}

async function ReportView({ params }: Props) {
  const { communityId, runDate, configSlug } = await params;

  if (!RUN_DATE_REGEX.test(runDate) || !CONFIG_SLUG_REGEX.test(configSlug)) {
    notFound();
  }

  const community = await getCommunityDetails(communityId);

  if (!community) {
    notFound();
  }

  return <PublicReportViewPage community={community} runDate={runDate} configSlug={configSlug} />;
}

// The page itself no longer awaits params, so the route's chrome paints from
// the first byte and the data streams into the loading.tsx fallback instead of
// the whole navigation blocking on the fetch. Everything params-dependent —
// including validation and every notFound() — stays inside the boundary, so
// behaviour for bad input is unchanged.
export default function Page(props: Props) {
  return (
    <Suspense fallback={<Loading />}>
      <ReportView params={props.params} />
    </Suspense>
  );
}
