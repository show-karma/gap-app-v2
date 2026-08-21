import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PublicReportListPage } from "@/components/Pages/Community/PortfolioReports/PublicReportListPage";
import { communitySubpageMetadata } from "@/utilities/metadata/communityCanonical";
import { getCommunityDetails } from "@/utilities/queries/v2/community";
import Loading from "./loading";

interface Props {
  params: Promise<{ communityId: string }>;
}

// Self-canonical. Previously inherited defaultMetadata, whose canonical is the
// homepage "/", so every community's reports page pointed its canonical at the
// site root instead of itself.
//
// The title/description used to be inherited from the community layout. This
// route now lives in the chrome-free (cover) group, which has no community
// header to inherit from, so it names itself.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { communityId } = await params;
  const canonicalMetadata = await communitySubpageMetadata(communityId, "reports");
  const community = await getCommunityDetails(communityId);
  const communityName = community?.details?.name || communityId;

  return {
    ...canonicalMetadata,
    title: `Portfolio Reports - ${communityName}`,
    description: `Published portfolio reports for ${communityName} — progress, outcomes, and funding activity across the community's projects.`,
  };
}

async function ReportList({ params }: Props) {
  const { communityId } = await params;
  const community = await getCommunityDetails(communityId);

  if (!community) {
    notFound();
  }

  return <PublicReportListPage community={community} />;
}

// The page itself no longer awaits params, so the route's chrome paints from
// the first byte and the data streams into the loading.tsx fallback instead of
// the whole navigation blocking on the fetch. Everything params-dependent —
// including validation and every notFound() — stays inside the boundary, so
// behaviour for bad input is unchanged.
export default function Page(props: Props) {
  return (
    <Suspense fallback={<Loading />}>
      <ReportList params={props.params} />
    </Suspense>
  );
}
