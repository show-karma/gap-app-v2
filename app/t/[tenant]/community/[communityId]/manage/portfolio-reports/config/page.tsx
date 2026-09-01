import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ReportConfigPage } from "@/components/Pages/Admin/PortfolioReports/ReportConfigPage";
import { Spinner } from "@/components/Utilities/Spinner";
import { getCommunityPrograms } from "@/services/community-programs.service";
import { defaultMetadata } from "@/utilities/meta";
import { getCommunityDetails } from "@/utilities/queries/v2/community";

export const metadata = defaultMetadata;

interface Props {
  params: Promise<{ communityId: string }>;
}

export default async function Page(props: Props) {
  const { communityId } = await props.params;
  const community = await getCommunityDetails(communityId);

  if (!community) {
    notFound();
  }

  // Errors deliberately bubble to Next.js error.tsx (the service logs first):
  // silently degrading to [] would make a fetch outage indistinguishable from
  // "this community has no programs" and let admins save configs with none.
  const grantPrograms = await getCommunityPrograms(communityId);

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center p-12">
          <Spinner />
        </div>
      }
    >
      <ReportConfigPage community={community} grantPrograms={grantPrograms} />
    </Suspense>
  );
}
