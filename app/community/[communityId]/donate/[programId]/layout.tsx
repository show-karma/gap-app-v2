import { getCommunityDetailsV2 } from "@/utilities/queries/getCommunityDataV2";
import { pagesOnRoot } from "@/utilities/pagesOnRoot";

type Params = Promise<{
  communityId: string;
  programId: string;
}>;

export default async function Layout(props: {
  children: React.ReactNode;
  params: Params;
}) {
  const { communityId } = await props.params;
  const { children } = props;

  if (pagesOnRoot.includes(communityId)) {
    return undefined;
  }

  const community = await getCommunityDetailsV2(communityId);
  if (!community) return undefined;

  return (
    <div className="flex w-full h-full max-w-full flex-col justify-start max-lg:flex-col">{children}</div>
  );
}
