import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PublicReportViewPage } from "@/components/Pages/Community/PortfolioReports/PublicReportViewPage";
import { communitySubpageMetadata } from "@/utilities/metadata/communityCanonical";
import { RUN_DATE_REGEX } from "@/utilities/portfolio-reports/period";
import { getCommunityDetails } from "@/utilities/queries/v2/community";
import Loading from "./loading";

interface Props {
  params: Promise<{ communityId: string; runDate: string }>;
}

// Self-canonical per report run-date. Previously inherited defaultMetadata,
// whose canonical is the homepage "/". Mirror the page's run-date validation so
// an invalid run-date (which the page 404s) never emits a bogus canonical.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { communityId, runDate } = await params;
  if (!RUN_DATE_REGEX.test(runDate)) return {};
  return communitySubpageMetadata(communityId, `reports/${runDate}`);
}

async function ReportView({ params }: Props) {
  const { communityId, runDate } = await params;

  if (!RUN_DATE_REGEX.test(runDate)) {
    notFound();
  }

  const community = await getCommunityDetails(communityId);

  if (!community) {
    notFound();
  }

  return <PublicReportViewPage community={community} runDate={runDate} />;
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
