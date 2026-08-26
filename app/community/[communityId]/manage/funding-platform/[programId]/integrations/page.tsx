"use client";

import { ArrowLeftIcon } from "@heroicons/react/24/solid";
import { useParams } from "next/navigation";
import { SimLinksCard } from "@/components/FundingPlatform/Integrations/SimLinksCard";
import { SimocracyConfigCard } from "@/components/FundingPlatform/Integrations/SimocracyConfigCard";
import { Spinner } from "@/components/Utilities/Spinner";
import { useAuth } from "@/hooks/useAuth";
import { useFundingPrograms } from "@/hooks/useFundingPlatform";
import { Link } from "@/src/components/navigation/Link";
import { FundingPlatformGuard } from "@/src/core/rbac";
import { usePermissionContext } from "@/src/core/rbac/context/permission-context";
import { Permission } from "@/src/core/rbac/types";
import { layoutTheme } from "@/src/helper/theme";
import { PAGES } from "@/utilities/pages";

export default function ProgramIntegrationsPage() {
  const { communityId, programId: combinedProgramId } = useParams() as {
    communityId: string;
    programId: string;
  };

  // Extract normalized programId (remove chainId suffix if present)
  // Use lastIndexOf to handle programIds that may contain underscores
  const programId = combinedProgramId.includes("_")
    ? combinedProgramId.slice(0, combinedProgramId.lastIndexOf("_"))
    : combinedProgramId;

  const { isLoading: isLoadingPermissions, can, isReviewer } = usePermissionContext();
  const {
    programs = [],
    isLoading: isLoadingPrograms,
    error: programsError,
  } = useFundingPrograms(communityId);
  const { address } = useAuth();

  const canEdit = can(Permission.PROGRAM_EDIT);

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

  const program = programs.find((p) => p.programId === programId);
  const programName = program?.metadata?.title || program?.name || "Untitled Program";

  if (!program) {
    return (
      <FundingPlatformGuard>
        <div className={layoutTheme.padding}>
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-700 dark:text-red-300">
              Program not found. It may have been deleted or you don&apos;t have access.
            </p>
          </div>
        </div>
      </FundingPlatformGuard>
    );
  }

  return (
    <FundingPlatformGuard>
      <div className="sm:px-3 md:px-4 px-6 py-6">
        <div className="max-w-3xl mx-auto">
          <Link
            href={PAGES.MANAGE.FUNDING_PLATFORM.ROOT(communityId)}
            className="inline-flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-1" />
            Back to Programs
          </Link>

          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Integrations</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Connect &quot;{programName}&quot; to external decision mechanisms.
          </p>

          <div className="mt-6 space-y-6">
            <SimocracyConfigCard programId={programId} canEdit={canEdit} />
            <SimLinksCard
              programId={programId}
              canManage={canEdit}
              isReviewer={isReviewer}
              viewerAddress={address}
            />
          </div>
        </div>
      </div>
    </FundingPlatformGuard>
  );
}
