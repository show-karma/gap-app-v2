import { registryService } from "@/services/registry.service";
import { pagesOnRoot } from "@/utilities/pagesOnRoot";
import { getCommunityDetailsV2 } from "@/utilities/queries/getCommunityDataV2";
import { DonationHeader } from "./header";

type Params = Promise<{
  communityId: string;
  programId: string;
}>;

export default async function Layout(props: { children: React.ReactNode; params: Params }) {
  const { communityId, programId } = await props.params;
  const { children } = props;

  if (pagesOnRoot.includes(communityId)) {
    return undefined;
  }

  const community = await getCommunityDetailsV2(communityId);
  if (!community) return undefined;

  const programSplitted = programId.split("_");
  const programIsolatedId = programSplitted[0];
  const programWithoutChain = parseInt(programSplitted[1], 10);

  const program = await registryService.searchProgramById(programIsolatedId, programWithoutChain);
  if (!program) return undefined;

  return (
    <div className="flex w-full h-full max-w-full flex-col justify-start max-lg:flex-col">
      <DonationHeader community={community} programId={programId} program={program} />
      <div className="flex flex-col w-full max-w-full px-4 pb-4 sm:px-6 lg:px-8 py-2">
        {children}
      </div>
    </div>
  );
}
