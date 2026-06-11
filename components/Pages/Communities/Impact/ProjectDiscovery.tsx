"use client";

import { Listbox } from "@headlessui/react";
import { ChevronUpDownIcon } from "@heroicons/react/24/outline";
import * as Slider from "@radix-ui/react-slider";
import { useParams } from "next/navigation";
import pluralize from "pluralize";
import { memo, useMemo, useState } from "react";
import { Button } from "@/components/Utilities/Button";
import { useCommunityCategories } from "@/hooks/communities/useCommunityCategories";
import { useIsCommunityAdmin } from "@/hooks/communities/useIsCommunityAdmin";
import { useProjectDiscovery } from "@/hooks/communities/useProjectDiscovery";
import { useCommunityPrograms } from "@/hooks/usePrograms";
import type { ProjectDiscoveryResult } from "@/services/projectDiscovery";
import { Link } from "@/src/components/navigation/Link";
import type { FundingProgramResponse } from "@/src/features/funding-map/types/funding-program";
import type { Category, ImpactIndicator } from "@/types/impactMeasurement";
import formatCurrency from "@/utilities/formatCurrency";
import { PAGES } from "@/utilities/pages";

interface IndicatorDistribution {
  [indicatorId: string]: number;
}

const UNTITLED_PROGRAM = "Untitled Program";

const programLabel = (program: FundingProgramResponse | null): string =>
  program?.metadata?.title || UNTITLED_PROGRAM;

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
                emptyHelp={
                  <p className="text-sm text-gray-600 dark:text-zinc-400">
                    No programs have been configured for this community yet.
                  </p>
                }
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

interface FilterSelectProps<T> {
  id: string;
  label: string;
  items: T[];
  value: T | null;
  onChange: (value: T) => void;
  getKey: (item: T) => string;
  getLabel: (item: T) => string;
  placeholder: string;
  isEmpty: boolean;
  emptyButtonLabel: string;
  emptyHelp: React.ReactNode;
}

const FilterSelect = <T,>({
  id,
  label,
  items,
  value,
  onChange,
  getKey,
  getLabel,
  placeholder,
  isEmpty,
  emptyButtonLabel,
  emptyHelp,
}: FilterSelectProps<T>) => {
  const helpId = `${id}-empty-help`;

  // When there is nothing to choose we render a plain, non-interactive button
  // instead of a HeadlessUI Listbox: HeadlessUI v2 manages its own aria
  // attributes and does not forward aria-describedby, so a native button is
  // the reliable way to associate the explanatory help text (WCAG 2.2 AA).
  if (isEmpty) {
    return (
      <>
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-zinc-300">
          {label}
        </label>
        <div className="relative mt-1">
          <button
            type="button"
            id={id}
            disabled
            aria-describedby={helpId}
            className="relative w-full cursor-not-allowed opacity-60 rounded-lg bg-white dark:bg-zinc-800 py-3 pl-4 pr-10 text-left border border-gray-200 dark:border-zinc-700 shadow-sm"
          >
            <span className="block truncate text-gray-900 dark:text-zinc-100">
              {emptyButtonLabel}
            </span>
            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
              <ChevronUpDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
            </span>
          </button>
        </div>
        <div id={helpId} className="mt-2 space-y-1">
          {emptyHelp}
        </div>
      </>
    );
  }

  return (
    <>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-zinc-300">
        {label}
      </label>
      <Listbox value={value} onChange={onChange}>
        <div className="relative mt-1">
          <Listbox.Button
            id={id}
            className="relative w-full cursor-default rounded-lg bg-white dark:bg-zinc-800 py-3 pl-4 pr-10 text-left border border-gray-200 dark:border-zinc-700 shadow-sm hover:border-primary/50 transition-colors focus:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
          >
            <span className="block truncate text-gray-900 dark:text-zinc-100">
              {value ? getLabel(value) : placeholder}
            </span>
            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
              <ChevronUpDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
            </span>
          </Listbox.Button>
          <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg bg-white dark:bg-zinc-800 py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none">
            {items.map((item) => (
              <Listbox.Option
                key={getKey(item)}
                value={item}
                className={({ active }) =>
                  `relative cursor-pointer select-none py-3 pl-4 pr-9 ${
                    active ? "bg-primary/5 text-primary" : "text-gray-900 dark:text-zinc-100"
                  }`
                }
              >
                {getLabel(item)}
              </Listbox.Option>
            ))}
          </Listbox.Options>
        </div>
      </Listbox>
    </>
  );
};

interface IndicatorSlidersProps {
  indicators: ImpactIndicator[];
  indicatorDistribution: IndicatorDistribution;
  onChange: (indicatorId: string, newValue: number) => void;
}

const IndicatorSliders = ({
  indicators,
  indicatorDistribution,
  onChange,
}: IndicatorSlidersProps) => (
  <div className="space-y-3 bg-white dark:bg-zinc-800 rounded-xl p-6 border border-gray-200 dark:border-zinc-700 shadow-sm">
    <div className="space-y-1">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-zinc-100">
        Impact Distribution
      </h3>
      <p className="text-sm text-gray-600 dark:text-zinc-400">
        Adjust the sliders to set the weight for each indicators.
      </p>
    </div>
    <div className="space-y-8">
      {indicators.map((indicator) => (
        <div key={indicator.id} className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="font-medium text-gray-900 dark:text-zinc-100">{indicator.name}</span>
            <span className="font-medium text-primary">
              {Math.round((indicatorDistribution[indicator.id] ?? 0) * 100)}%
            </span>
          </div>
          <Slider.Root
            className="relative flex w-full touch-none select-none items-center py-2"
            value={[(indicatorDistribution[indicator.id] ?? 0) * 100]}
            onValueChange={(values) => onChange(indicator.id, values[0] / 100)}
            max={100}
            step={1}
          >
            <Slider.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full">
              <Slider.Range className="absolute h-full" />
            </Slider.Track>
            <Slider.Thumb className="block h-4 w-4 rounded-full border border-primary/50 bg-white shadow-sm transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </Slider.Root>
        </div>
      ))}
    </div>
  </div>
);

interface DiscoveryResultsProps {
  isError: boolean;
  results: ProjectDiscoveryResult[] | undefined;
  indicatorDistribution: IndicatorDistribution;
  activeCalculation: string | null;
  onRetry: () => void;
  onScoreClick: (projectUID: string) => void;
  onCloseCalculation: () => void;
}

const DiscoveryResults = ({
  isError,
  results,
  indicatorDistribution,
  activeCalculation,
  onRetry,
  onScoreClick,
  onCloseCalculation,
}: DiscoveryResultsProps) => {
  if (isError) {
    return (
      <div className="flex w-full flex-col items-start justify-center h-[400px] gap-3 pl-12 border-l border-l-zinc-400 ml-10">
        <p className="text-lg font-medium text-gray-900 dark:text-zinc-100">
          We couldn&apos;t run the discovery search.
        </p>
        <p className="text-sm text-gray-600 dark:text-zinc-400">
          Something went wrong while discovering projects. Please try again.
        </p>
        <Button onClick={onRetry} className="px-6">
          Retry
        </Button>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="flex w-full flex-col items-start justify-center h-[400px] text-gray-500 pl-12 border-l border-l-zinc-400 ml-10">
        <p className="text-lg">Select a category and program, then discover projects</p>
        <p className="text-sm">Use the filters on the left to discover projects</p>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="flex w-full flex-col items-start justify-center h-[400px] text-gray-500 pl-12 border-l border-l-zinc-400 ml-10">
        <p className="text-lg">No projects matched these filters</p>
        <p className="text-sm">Try a different category, program, or fewer endorsers.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-zinc-100">
          Discovery Results
        </h3>
        <span className="text-sm text-gray-600 dark:text-zinc-400">
          {results.length} {pluralize("project", results.length)} found
        </span>
      </div>
      <div className="grid grid-cols-1 gap-6">
        {results.map((result) => (
          <DiscoveryResultCard
            key={result.project.projectUID}
            result={result}
            indicatorDistribution={indicatorDistribution}
            isCalculationOpen={activeCalculation === result.project.projectUID}
            onScoreClick={onScoreClick}
            onCloseCalculation={onCloseCalculation}
          />
        ))}
      </div>
    </div>
  );
};

interface DiscoveryResultCardProps {
  result: ProjectDiscoveryResult;
  indicatorDistribution: IndicatorDistribution;
  isCalculationOpen: boolean;
  onScoreClick: (projectUID: string) => void;
  onCloseCalculation: () => void;
}

const DiscoveryResultCard = memo(
  ({
    result,
    indicatorDistribution,
    isCalculationOpen,
    onScoreClick,
    onCloseCalculation,
  }: DiscoveryResultCardProps) => (
    <div className="rounded-xl flex flex-col gap-4 border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-6 shadow-sm hover:shadow-md transition-shadow relative">
      <div className="flex justify-between items-start gap-4">
        <div className="flex flex-col gap-2">
          <Link
            href={PAGES.PROJECT.OVERVIEW(result.project.projectSlug)}
            className="text-2xl font-bold text-gray-900 dark:text-zinc-100 line-clamp-2"
          >
            {result.project.projectTitle}
          </Link>
          <div className="space-y-2">
            <Link
              href={PAGES.PROJECT.GRANT(result.project.projectSlug, result.project.grantUID)}
              className="text-md text-gray-600 dark:text-zinc-400"
            >
              {result.project.grantTitle}
            </Link>
          </div>
        </div>
        <div className="flex flex-col items-end justify-center">
          <button
            type="button"
            onClick={() => onScoreClick(result.project.projectUID)}
            className="text-2xl text-primary font-bold hover:opacity-80 transition-opacity underline decoration-dotted cursor-pointer"
            aria-label="Show impact score calculation"
          >
            {formatCurrency(result.impactScore)}
          </button>
          <span className="text-sm font-medium text-gray-600 dark:text-zinc-400">Impact Score</span>
        </div>
      </div>

      {isCalculationOpen && (
        <div className="absolute right-0 top-16 z-10 w-80 bg-white dark:bg-zinc-800 rounded-lg shadow-lg border border-gray-200 dark:border-zinc-700 p-4">
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-sm font-medium text-gray-700 dark:text-zinc-300">
              Impact Score Calculation
            </h4>
            <button
              type="button"
              onClick={onCloseCalculation}
              className="text-gray-400 hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-300"
              aria-label="Close calculation"
            >
              ×
            </button>
          </div>
          <div className="space-y-2">
            {result.impact.map((impact) => (
              <div
                key={impact.impactIndicatorId}
                className="flex justify-between items-center text-sm"
              >
                <span className="text-gray-600 dark:text-zinc-400">{impact.indicatorName}</span>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 dark:text-zinc-400">
                    {formatCurrency(impact.avgValue)}
                  </span>
                  <span className="text-gray-400 dark:text-zinc-500">×</span>
                  <span className="text-primary">
                    {Math.round((indicatorDistribution[impact.impactIndicatorId] ?? 0) * 100)}%
                  </span>
                  <span className="text-gray-400 dark:text-zinc-500">=</span>
                  <span className="font-medium text-gray-900 dark:text-zinc-100">
                    {formatCurrency(
                      impact.avgValue * (indicatorDistribution[impact.impactIndicatorId] ?? 0)
                    )}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
);

DiscoveryResultCard.displayName = "DiscoveryResultCard";
