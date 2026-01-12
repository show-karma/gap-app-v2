import { FundingOpportunities } from "@/components/CommunityGrants/FundingOpportunities";
import { pagesOnRoot } from "@/utilities/pagesOnRoot";
import { getCommunityDetails } from "@/utilities/queries/v2/getCommunityData";
import { getFundingOpportunities } from "@/utilities/queries/v2/getFundingOpportunities";

type Props = {
  params: Promise<{
    communityId: string;
  }>;
};

export default async function FundingOpportunitiesPage(props: Props) {
  const { communityId } = await props.params;

  if (pagesOnRoot.includes(communityId)) {
    return undefined;
  }

  const communityDetails = await getCommunityDetails(communityId);

  if (!communityDetails) {
    return null;
  }

  // Use community UID for the API filter (communityRef stores UIDs, not slugs)
  const fundingOpportunities = await getFundingOpportunities(communityDetails.uid);

  return (
    <div className="-my-4 flex flex-col w-full max-w-full py-2">
      <FundingOpportunities
        communityUid={communityDetails.uid}
        communitySlug={communityId}
        initialData={fundingOpportunities}
      />
    </div>
  );
}
