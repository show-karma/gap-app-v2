import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PortfolioReportListPage } from "@/components/Pages/Admin/PortfolioReports/PortfolioReportListPage";
import { defaultMetadata } from "@/utilities/meta";
import { getCommunityDetails } from "@/utilities/queries/v2/community";
import Loading from "./loading";

export const metadata = defaultMetadata;

interface Props {
  params: Promise<{ communityId: string }>;
}

async function ReportList({ params }: Props) {
  const { communityId } = await params;
  const community = await getCommunityDetails(communityId);

  if (!community) {
    notFound();
  }

  return <PortfolioReportListPage community={community} />;
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
