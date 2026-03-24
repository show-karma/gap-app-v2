import type { Metadata } from "next";
import { CommunityFinancials } from "@/components/Pages/Communities/Financials";
import { PROJECT_NAME } from "@/constants/brand";
import { getCommunityDetails } from "@/utilities/queries/v2/getCommunityData";

type Props = {
  params: Promise<{
    communityId: string;
  }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { communityId } = await params;
  const community = await getCommunityDetails(communityId);
  const communityName = community?.details?.name || communityId;

  return {
    title: `${communityName} Financials & Treasury | ${PROJECT_NAME}`,
    description: `Review financial data and treasury information for ${communityName}. Track grant disbursements, funding allocations, and overall ecosystem spending on ${PROJECT_NAME}.`,
  };
}

export default function FinancialsPage() {
  return (
    <div className="flex flex-col gap-5 py-6">
      <CommunityFinancials />
    </div>
  );
}
