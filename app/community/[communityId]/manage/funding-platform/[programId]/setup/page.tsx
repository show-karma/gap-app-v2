"use client";

import { useParams } from "next/navigation";
import { SetupWizard } from "@/components/FundingPlatform/SetupWizard";
import { Spinner } from "@/components/Utilities/Spinner";
import { useFundingPrograms } from "@/hooks/useFundingPlatform";
import { useProgramSetupProgress } from "@/hooks/useProgramSetupProgress";
import { Can } from "@/src/core/rbac";
import { usePermissionContext } from "@/src/core/rbac/context/permission-context";
import { Permission } from "@/src/core/rbac/types";
import { layoutTheme } from "@/src/helper/theme";

export default function ProgramSetupPage() {
  const { communityId, programId: combinedProgramId } = useParams() as {
    communityId: string;
    programId: string;
  };

  // Extract normalized programId (remove chainId suffix if present)
  // Use lastIndexOf to handle programIds that may contain underscores
  const programId = combinedProgramId.includes("_")
    ? combinedProgramId.slice(0, combinedProgramId.lastIndexOf("_"))
    : combinedProgramId;

  const { isLoading: isLoadingPermissions } = usePermissionContext();
  const {
    programs = [],
    isLoading: isLoadingPrograms,
    error: programsError,
  } = useFundingPrograms(communityId);
  const progress = useProgramSetupProgress(communityId, programId);

  if (isLoadingPermissions || isLoadingPrograms) {
    return (
      <div className="flex w-full items-center justify-center min-h-[400px]">
        <Spinner />
      </div>
    );
  }

  if (programsError) {
    return (
      <div className={layoutTheme.padding}>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-700 dark:text-red-300">
            Failed to load program data. Please try again.
          </p>
        </div>
      </div>
    );
  }

  // Find the program to get its name (moved after loading/error checks)
  const program = programs.find((p) => p.programId === programId);
  const programName = program?.metadata?.title || program?.name || "Untitled Program";

  if (!program) {
    return (
      <Can permission={Permission.PROGRAM_EDIT}>
        <div className={layoutTheme.padding}>
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-700 dark:text-red-300">
              Program not found. It may have been deleted or you don&apos;t have access.
            </p>
          </div>
        </div>
      </Can>
    );
  }

  return (
    <Can permission={Permission.PROGRAM_EDIT}>
      <div className="sm:px-3 md:px-4 px-6 py-6">
        <SetupWizard
          communityId={communityId}
          programId={programId}
          programName={programName}
          progress={progress}
        />
      </div>
    </Can>
  );
}
