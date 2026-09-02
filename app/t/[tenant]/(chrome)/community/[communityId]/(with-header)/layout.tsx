import { CommunityContentWrapper } from "@/components/Community/CommunityContentWrapper";
import CommunityHeader from "@/components/Community/Header";
import { CommunityNotFound } from "@/components/Pages/Communities/CommunityNotFound";
import { pagesOnRoot } from "@/utilities/pagesOnRoot";
import { getCommunityDetailsCached } from "@/utilities/queries/v2/getCommunityData.cached";

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

  // The cached twin, not the raw loader. This layout is the frame the build
  // named for the whole `(with-header)` group:
  //
  //   Route "/t/[tenant]/community/[communityId]": uncached or runtime data
  //     at WithHeaderLayout ((with-header)/layout.tsx:11:31)
  //
  // Every route in the group inherits it, so one uncached read here kept six
  // of them out of the prerender.
  const community = await getCommunityDetailsCached(communityId);

  if (!community) {
    return <CommunityNotFound communityId={communityId} />;
  }

  return (
    <div className="flex w-full h-full max-w-full flex-col justify-start max-lg:flex-col">
      <CommunityHeader community={community} />
      <main className="flex w-full max-w-full flex-col">
        <CommunityContentWrapper>{props.children}</CommunityContentWrapper>
      </main>
    </div>
  );
}
