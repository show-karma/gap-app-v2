import { CommunityContentWrapper } from "@/components/Community/CommunityContentWrapper";
import CommunityHeader from "@/components/Community/Header";
import { CommunityNotFound } from "@/components/Pages/Communities/CommunityNotFound";
import { pagesOnRoot } from "@/utilities/pagesOnRoot";
import { getCommunityDetails } from "@/utilities/queries/v2/getCommunityData";

type Params = Promise<{
  communityId: string;
}>;

export default async function WithHeaderLayout(props: {
  children: React.ReactNode;
  params: Params;
}) {
  const { communityId } = await props.params;

  if (pagesOnRoot.includes(communityId)) {
    return undefined;
  }

  const community = await getCommunityDetails(communityId);

  if (!community) {
    return <CommunityNotFound communityId={communityId} />;
  }

  return (
    <div className="flex w-full h-full max-w-full flex-col justify-start max-lg:flex-col">
      <CommunityHeader community={community} />
      <CommunityContentWrapper>{props.children}</CommunityContentWrapper>
    </div>
  );
}
