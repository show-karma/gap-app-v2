import { getCommunityDetailsV2 } from "@/utilities/queries/getCommunityDataV2";
import { pagesOnRoot } from "@/utilities/pagesOnRoot";
import { CommunityDetailsV2 } from "@/types/community";
import Image from "next/image";
import { communityColors } from "@/utilities/communityColors";
import Link from "next/link";
import { PAGES } from "@/utilities/pages";
import { ChevronRightIcon } from "@heroicons/react/20/solid";
import { programService as ProgramService } from "@/services/programs";
import { registryService } from "@/services/registry.service";
import { GrantProgram } from "@/components/Pages/ProgramRegistry/ProgramList";
import { ReadMore } from "@/utilities/ReadMore";
import { useDonationCart } from "@/store";
import { DonationHeader } from "./header";

type Params = Promise<{
  communityId: string;
  programId: string;
}>;


export default async function Layout(props: {
  children: React.ReactNode;
  params: Params;
}) {
  const { communityId, programId } = await props.params;
  const { children } = props;

  if (pagesOnRoot.includes(communityId)) {
    return undefined;
  }

  const community = await getCommunityDetailsV2(communityId);
  if (!community) return undefined;

  const programSplitted = programId.split("_");
  const programIsolatedId = programSplitted[0];
  const programWithoutChain = parseInt(programSplitted[1]);

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
