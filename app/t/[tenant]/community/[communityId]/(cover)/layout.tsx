import { CommunityNotFound } from "@/components/Pages/Communities/CommunityNotFound";
import { layoutTheme } from "@/src/helper/theme";
import { pagesOnRoot } from "@/utilities/pagesOnRoot";
import { getCommunityDetails } from "@/utilities/queries/v2/getCommunityData";
import { cn } from "@/utilities/tailwind";
import { CommunityCoverBar } from "./CommunityCoverBar";

type Params = Promise<{
  communityId: string;
}>;

/**
 * Chrome-free "cover page" layout.
 *
 * These routes (financials, portfolio reports) are standalone documents that
 * own their own hero, so they deliberately skip the explorer chrome the
 * sibling `(with-header)` group renders — no CommunityHeader, no
 * HeaderStatsCards, no CommunityPageNavigator. Everything else that group
 * supplied is re-supplied here: the pagesOnRoot guard, the community lookup +
 * not-found state, the <main> landmark, and the page gutter that
 * CommunityContentWrapper used to inject.
 */
export default async function CoverLayout(props: { children: React.ReactNode; params: Params }) {
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
      <CommunityCoverBar community={community} />
      <main className="flex w-full max-w-full flex-col">
        <div className={cn(layoutTheme.padding, "w-full max-w-full")}>{props.children}</div>
      </main>
    </div>
  );
}
