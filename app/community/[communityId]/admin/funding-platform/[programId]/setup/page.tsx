"use client";

import { useParams } from "next/navigation";
import { SetupWizard } from "@/components/FundingPlatform/SetupWizard";
import { Spinner } from "@/components/Utilities/Spinner";
import { useCommunityAdminAccess } from "@/hooks/communities/useCommunityAdminAccess";
import { useFundingPrograms } from "@/hooks/useFundingPlatform";
import { useProgramSetupProgress } from "@/hooks/useProgramSetupProgress";
import { layoutTheme } from "@/src/helper/theme";
import { MESSAGES } from "@/utilities/messages";

export default function ProgramSetupPage() {
  const { communityId, programId: combinedProgramId } = useParams() as {
    communityId: string;
    programId: string;
  };

  // Extract normalized programId (remove chainId suffix if present)
  const programId = combinedProgramId.includes("_")
    ? combinedProgramId.split("_")[0]
    : combinedProgramId;

  const { hasAccess, isLoading: isLoadingAdmin } = useCommunityAdminAccess(communityId);
  const { programs, isLoading: isLoadingPrograms } = useFundingPrograms(communityId);
  const progress = useProgramSetupProgress(communityId, programId);

  // Find the program to get its name
  const program = programs.find((p) => p.programId === programId);
  const programName = program?.metadata?.title || program?.name || "Untitled Program";

  if (isLoadingAdmin || isLoadingPrograms) {
    return (
      <div className="flex w-full items-center justify-center min-h-[400px]">
        <Spinner />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className={layoutTheme.padding}>
        <p className="text-red-500">{MESSAGES.REVIEWS.NOT_ADMIN}</p>
      </div>
    );
  }

  if (!program) {
    return (
      <div className={layoutTheme.padding}>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-700 dark:text-red-300">
            Program not found. It may have been deleted or you don&apos;t have access.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="sm:px-3 md:px-4 px-6 py-6">
      <SetupWizard
        communityId={communityId}
        programId={programId}
        programName={programName}
        progress={progress}
      />
    </div>
  );
}
