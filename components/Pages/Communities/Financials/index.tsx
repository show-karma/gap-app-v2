"use client";

import { useParams } from "next/navigation";
import { useEffect } from "react";
import { errorManager } from "@/components/Utilities/errorManager";
import { useProgramFinancials, useSelectedProgram } from "@/hooks/financials/useProgramFinancials";
import { useCommunityPrograms } from "@/hooks/usePrograms";
import { FinancialsEmptyState } from "./FinancialsEmptyState";
import { FinancialsSummary } from "./FinancialsSummary";
import { ProgramSelector } from "./ProgramSelector";
import { ProjectFinancialsList } from "./ProjectFinancialsList";

export function CommunityFinancials() {
  const { communityId } = useParams();
  const {
    data: programs,
    isLoading: isLoadingPrograms,
    isError: isProgramsError,
    error: programsError,
  } = useCommunityPrograms(communityId as string);
  const [selectedProgramId] = useSelectedProgram();

  const {
    data,
    isLoading: isLoadingFinancials,
    isError: isFinancialsError,
    error: financialsError,
    hasNextPage,
    fetchNextPage,
  } = useProgramFinancials(selectedProgramId || null);

  useEffect(() => {
    if (isProgramsError || isFinancialsError) {
      errorManager("Failed to load financials", programsError ?? financialsError);
    }
  }, [isProgramsError, isFinancialsError, programsError, financialsError]);

  if (isProgramsError || isFinancialsError) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
        Unable to load financials. Please try again.
      </div>
    );
  }

  const hasPrograms = (programs?.length ?? 0) > 0;
  const hasProgramSelected = !!selectedProgramId;
  const summary = data?.pages[0]?.summary;

  return (
    <div className="flex flex-col gap-6" data-testid="community-financials">
      {/* Header with Program Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Financials</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Track funding allocation and disbursement status across projects
          </p>
        </div>
        {hasPrograms && !isLoadingPrograms && <ProgramSelector />}
      </div>

      {/* Content */}
      {isLoadingPrograms ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full" />
        </div>
      ) : !hasPrograms || !hasProgramSelected ? (
        <FinancialsEmptyState hasPrograms={hasPrograms} />
      ) : (
        <>
          {/* Summary Stats */}
          <FinancialsSummary summary={summary} isLoading={isLoadingFinancials} />

          {/* Projects List */}
          <ProjectFinancialsList
            data={data}
            isLoading={isLoadingFinancials}
            hasNextPage={hasNextPage ?? false}
            fetchNextPage={fetchNextPage}
          />
        </>
      )}
    </div>
  );
}

export { FinancialsEmptyState } from "./FinancialsEmptyState";
export { FinancialsSummary } from "./FinancialsSummary";
export { ProgramSelector } from "./ProgramSelector";
export { ProjectFinancialRow } from "./ProjectFinancialRow";
export { ProjectFinancialsList } from "./ProjectFinancialsList";
