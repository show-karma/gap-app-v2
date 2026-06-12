"use client";

import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/Utilities/Button";
import { useCommunityCategories } from "@/hooks/communities/useCommunityCategories";
import { useIsCommunityAdmin } from "@/hooks/communities/useIsCommunityAdmin";
import { useProjectDiscovery } from "@/hooks/communities/useProjectDiscovery";
import { useCommunityPrograms } from "@/hooks/usePrograms";
import type { IndicatorDistribution } from "@/services/projectDiscovery";
import { Link } from "@/src/components/navigation/Link";
import type { FundingProgramResponse } from "@/src/features/funding-map/types/funding-program";
import type { Category, ImpactIndicator } from "@/types/impactMeasurement";
import { PAGES } from "@/utilities/pages";
import { DiscoveryResults } from "./DiscoveryResults";
import { FilterSelect } from "./FilterSelect";
import { IndicatorSliders } from "./IndicatorSliders";

const UNTITLED_PROGRAM = "Untitled Program";

const programLabel = (program: FundingProgramResponse | null): string =>
  program?.metadata?.title || UNTITLED_PROGRAM;

// Static empty-state help — hoisted so it isn't re-created on every render.
const PROGRAMS_EMPTY_HELP = (
  <p className="text-sm text-gray-600 dark:text-zinc-400">
    No programs have been configured for this community yet.
  </p>
);

export const ProjectDiscovery = () => {
  const params = useParams();
  const communityId = params.communityId as string;

  const categoriesQuery = useCommunityCategories(communityId);
  const programsQuery = useCommunityPrograms(communityId);
  const { isCommunityAdmin } = useIsCommunityAdmin(communityId);
  const discovery = useProjectDiscovery(communityId);

  const categories = categoriesQuery.data ?? [];
  const programs = programsQuery.data ?? [];

  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedProgram, setSelectedProgram] = useState<FundingProgramResponse | null>(null);
  const [endorserInput, setEndorserInput] = useState<string>("");
  const [endorsers, setEndorsers] = useState<string[]>([]);
  const [indicatorDistribution, setIndicatorDistribution] = useState<IndicatorDistribution>({});
  const [activeCalculation, setActiveCalculation] = useState<string | null>(null);

  const selectedCategoryIndicators = useMemo<ImpactIndicator[]>(() => {
    if (!selectedCategory) return [];
    // Both impact_segments and impact_indicators are optional in the shared
    // types (merged segments from the fetcher carry empty indicator arrays),
    // so guard each level — flatMap alone does not tolerate undefined.
    const allIndicators = (selectedCategory.impact_segments ?? []).flatMap(
      (segment) => segment.impact_indicators ?? []
    );
    return Array.from(
      new Map(allIndicators.map((indicator) => [indicator.id, indicator])).values()
    );
  }, [selectedCategory]);

  const handleCategoryChange = (category: Category | null) => {
    setSelectedCategory(category);
    const allIndicators = (category?.impact_segments ?? []).flatMap(
      (segment) => segment.impact_indicators ?? []
    );
    const uniqueIndicators = Array.from(
      new Map(allIndicators.map((indicator) => [indicator.id, indicator])).values()
    );
    const initialDistribution = uniqueIndicators.reduce((acc, indicator) => {
      acc[indicator.id] = uniqueIndicators.length ? 1 / uniqueIndicators.length : 0;
      return acc;
    }, {} as IndicatorDistribution);
    setIndicatorDistribution(initialDistribution);
  };

  const handleEndorserAdd = () => {
    if (endorserInput && !endorsers.includes(endorserInput)) {
      setEndorsers([...endorsers, endorserInput]);
      setEndorserInput("");
    }
  };

  const handleEndorserRemove = (endorser: string) => {
    setEndorsers(endorsers.filter((e) => e !== endorser));
  };

  const handleIndicatorDistributionChange = (indicatorId: string, newValue: number) => {
    const remainingValue = 1 - newValue;
    const otherIndicators = Object.keys(indicatorDistribution).filter((id) => id !== indicatorId);
    const newDistribution = { ...indicatorDistribution };

    newDistribution[indicatorId] = newValue;

    // Distribute remaining value proportionally among other indicators
    const totalOtherIndicators = otherIndicators.reduce(
      (sum, id) => sum + indicatorDistribution[id],
      0
    );
    otherIndicators.forEach((id) => {
      newDistribution[id] =
        totalOtherIndicators === 0
          ? remainingValue / otherIndicators.length
          : (indicatorDistribution[id] / totalOtherIndicators) * remainingValue;
    });

    setIndicatorDistribution(newDistribution);
  };

  const handleSearch = () => {
    if (!selectedCategory || !selectedProgram?.programId) return;
    discovery.mutate({
      programId: selectedProgram.programId,
      categoryId: selectedCategory.id,
      endorsers,
      indicatorDistribution,
    });
  };

  const handleScoreClick = (projectUID: string) => {
    setActiveCalculation(activeCalculation === projectUID ? null : projectUID);
  };

  const isFilterLoading = categoriesQuery.isLoading || programsQuery.isLoading;
  const isFilterError = categoriesQuery.isError || programsQuery.isError;
  const categoriesEmpty = !categoriesQuery.isError && categories.length === 0;
  const programsEmpty = !programsQuery.isError && programs.length === 0;

  const projectResults = discovery.data;

  if (isFilterLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        <p className="mt-4 text-gray-600 dark:text-zinc-400">Loading...</p>
      </div>
    );
  }

  if (isFilterError) {
    const retry = () => {
      if (categoriesQuery.isError) categoriesQuery.refetch();
      if (programsQuery.isError) programsQuery.refetch();
    };
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 text-center">
        <p className="text-lg font-medium text-gray-900 dark:text-zinc-100">
          We couldn&apos;t load the discovery filters.
        </p>
        <p className="text-sm text-gray-600 dark:text-zinc-400">
          Something went wrong while fetching categories and programs for this community.
        </p>
        <Button onClick={retry} className="px-6">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex justify-between gap-8 p-8 w-full mx-auto min-h-screen">
      {/* Left Side - Form */}
      <div className="w-full lg:w-[600px] flex-shrink-0">
        <div className="flex flex-col gap-8 sticky top-8">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-zinc-100">
              Project Discovery
            </h2>
            <p className="text-gray-600 dark:text-zinc-400">
              Discover projects based on categories, programs, and trusted endorsers.
            </p>
          </div>

          <div className="flex justify-between gap-4">
            <div className="w-1/2">
              <FilterSelect
                id="category-select"
                label="Category"
                items={categories}
                value={selectedCategory}
                onChange={handleCategoryChange}
                getKey={(category) => category.id}
                getLabel={(category) => category.name}
                placeholder="Select Category"
                isEmpty={categoriesEmpty}
                emptyButtonLabel="No categories available"
                emptyHelp={
                  <>
                    <p className="text-sm text-gray-600 dark:text-zinc-400">
                      No impact categories have been configured for this community yet.
                    </p>
                    {isCommunityAdmin && (
                      <Link
                        href={PAGES.ADMIN.EDIT_CATEGORIES(communityId)}
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        Configure categories
                      </Link>
                    )}
                  </>
                }
              />
            </div>

            <div className="w-1/2">
              <FilterSelect
                id="program-select"
                label="Program"
                items={programs}
                value={selectedProgram}
                onChange={setSelectedProgram}
                getKey={(program) => program.programId ?? ""}
                getLabel={(program) => programLabel(program)}
                placeholder="Select Program"
                isEmpty={programsEmpty}
                emptyButtonLabel="No programs available"
                emptyHelp={PROGRAMS_EMPTY_HELP}
              />
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-4">
              <label
                htmlFor="trusted-circle-input"
                className="block text-sm font-medium text-gray-700 dark:text-zinc-300"
              >
                Trusted Circle (Optional)
              </label>
              <div className="flex gap-3">
                <input
                  id="trusted-circle-input"
                  type="text"
                  value={endorserInput}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEndorserInput(e.target.value)
                  }
                  placeholder="Enter endorser address"
                  className="flex-1 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 px-4 py-3 text-sm shadow-sm hover:border-primary/50 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <Button onClick={handleEndorserAdd} className="px-6">
                  Add
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 min-h-[2.5rem]">
              {endorsers.map((endorser) => (
                <div
                  key={endorser}
                  className="flex items-center gap-2 bg-primary/5 text-primary rounded-full px-4 py-2 group hover:bg-primary/10 transition-colors"
                >
                  <span className="text-sm font-medium truncate max-w-[200px]">{endorser}</span>
                  <button
                    type="button"
                    onClick={() => handleEndorserRemove(endorser)}
                    className="text-primary/60 hover:text-primary transition-colors"
                    aria-label="Remove endorser"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          {selectedCategoryIndicators.length > 0 && (
            <IndicatorSliders
              indicators={selectedCategoryIndicators}
              indicatorDistribution={indicatorDistribution}
              onChange={handleIndicatorDistributionChange}
            />
          )}

          <div className="flex justify-end">
            <Button
              onClick={handleSearch}
              className="w-3xl px-8 py-3 text-base font-medium relative"
              disabled={!selectedCategory || !selectedProgram || discovery.isPending}
            >
              {discovery.isPending ? (
                <>
                  <span className="opacity-0">Discover Projects</span>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                  </div>
                </>
              ) : (
                "Discover Projects"
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Right Side - Results */}
      <div className="flex-grow">
        <DiscoveryResults
          isError={discovery.isError}
          results={projectResults}
          indicatorDistribution={indicatorDistribution}
          activeCalculation={activeCalculation}
          onRetry={handleSearch}
          onScoreClick={handleScoreClick}
          onCloseCalculation={() => setActiveCalculation(null)}
        />
      </div>
    </div>
  );
};
