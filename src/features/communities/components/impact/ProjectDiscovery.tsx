"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { Listbox } from "@headlessui/react";
import { Button } from "@/components/ui/button";
import * as Slider from "@radix-ui/react-slider";
import { ChevronUpDownIcon } from "@heroicons/react/24/outline";
import { INDEXER } from "@/utilities/indexer";
import { fetchData } from "@/lib/utils/fetch-data";
import Link from "next/link";
import formatCurrency from "@/utilities/formatCurrency";

interface Category {
  id: string;
  name: string;
  outputs: Output[];
  impact_segments: ImpactSegment[];
}

interface Output {
  id: string;
  name: string;
}

interface ImpactSegment {
  id: string;
  createdAt: string;
  updatedAt: string;
  name: string;
  description: string;
  type: string;
  impact_indicators: ImpactIndicator[];
}

interface ImpactIndicator {
  id: string;
  name: string;
  description: string;
  unitOfMeasure: string;
  createdAt: string;
  updatedAt: string;
}

interface Program {
  programId: string;
  name: string;
}

interface ProjectResult {
  project: {
    grantId: string;
    programId: string;
    grantUID: string;
    chainID: number;
    grantTitle: string;
    projectUID: string;
    projectTitle: string;
    projectSlug: string;
    projectEndorsers: string[];
  };
  impactScore: number;
  impact: {
    impactIndicatorId: string;
    indicatorName: string;
    indicatorDescription: string;
    indicatorUnitOfMeasure: string;
    categoryId: string;
    categoryName: string;
    avgValue: number;
    minValue: number;
    maxValue: number;
    lastValue: number;
    lastTimestamp: string;
  }[];
}

interface OutputDistribution {
  [key: string]: number;
}

export const ProjectDiscovery = () => {
  const params = useParams();
  const communityId = params.communityId as string;

  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null
  );
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [endorserInput, setEndorserInput] = useState<string>("");
  const [endorsers, setEndorsers] = useState<string[]>([]);
  const [indicatorDistribution, setIndicatorDistribution] =
    useState<OutputDistribution>({});
  const [projectResults, setProjectResults] = useState<ProjectResult[]>([]);
  const [selectedCategoryIndicators, setSelectedCategoryIndicators] = useState<
    ImpactIndicator[]
  >([]);
  const [activeCalculation, setActiveCalculation] = useState<string | null>(
    null
  );

  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true);
      try {
        const [[categoriesRes, categoriesError], [programsRes, programsError]] =
          await Promise.all([
            fetchData(INDEXER.COMMUNITY.CATEGORIES(communityId)),
            fetchData(INDEXER.COMMUNITY.PROGRAMS(communityId)),
          ]);
        if (categoriesError) {
          console.error("Error fetching categories:", categoriesError);
        }
        if (programsError) {
          console.error("Error fetching programs:", programsError);
        }
        setCategories(categoriesRes);
        setPrograms(programsRes);
      } catch (error) {
        console.error("Error fetching initial data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchInitialData();
  }, [communityId]);

  useEffect(() => {
    if (selectedCategory) {
      // Deduplicate indicators by ID
      const allIndicators = selectedCategory.impact_segments
        .map((segment) => segment.impact_indicators)
        .flat();
      const uniqueIndicators = Array.from(
        new Map(
          allIndicators.map((indicator) => [indicator.id, indicator])
        ).values()
      );
      setSelectedCategoryIndicators(uniqueIndicators);

      // Initialize output distribution evenly for unique indicators
      const initialDistribution = uniqueIndicators.reduce((acc, indicator) => {
        acc[indicator.id] = 1 / uniqueIndicators.length;
        return acc;
      }, {} as OutputDistribution);
      setIndicatorDistribution(initialDistribution);
    }
  }, [selectedCategory]);

  const handleEndorserAdd = () => {
    if (endorserInput && !endorsers.includes(endorserInput)) {
      setEndorsers([...endorsers, endorserInput]);
      setEndorserInput("");
    }
  };

  const handleEndorserRemove = (endorser: string) => {
    setEndorsers(endorsers.filter((e) => e !== endorser));
  };

  const handleIndicatorDistributionChange = (
    indicatorId: string,
    newValue: number
  ) => {
    const remainingValue = 1 - newValue;
    const otherIndicators = Object.keys(indicatorDistribution).filter(
      (id) => id !== indicatorId
    );
    const newDistribution = { ...indicatorDistribution };

    newDistribution[indicatorId] = newValue;

    // Distribute remaining value proportionally among other outputs
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

  const handleSearch = async () => {
    if (!selectedCategory || !selectedProgram) return;

    setIsSearching(true);
    try {
      const [response, error] = await fetchData(
        INDEXER.COMMUNITY.PROJECT_DISCOVERY(communityId),
        "POST",
        {
          programId: selectedProgram.programId,
          categoryId: selectedCategory.id,
          endorsers: endorsers,
          indicatorDistribution,
        }
      );
      if (error) {
        console.error("Error fetching project discovery results:", error);
      }
      setProjectResults(response.data);
    } catch (error) {
      console.error("Error fetching project discovery results:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleScoreClick = (projectUID: string) => {
    setActiveCalculation(activeCalculation === projectUID ? null : projectUID);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex justify-between gap-8 p-8 w-full mx-auto min-h-screen">
      {/* Left Side - Form */}
      <div className="w-full lg:w-[600px] flex-shrink-0">
        <div className="flex flex-col gap-8 sticky top-8">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold text-gray-900">
              Project Discovery
            </h2>
            <p className="text-gray-600">
              Discover projects based on categories, programs, and trusted
              endorsers.
            </p>
          </div>

          <div className="flex justify-between gap-4">
            <div className="w-1/2">
              <label className="block text-sm font-medium text-gray-700">
                Category
              </label>
              <Listbox value={selectedCategory} onChange={setSelectedCategory}>
                <div className="relative mt-1">
                  <Listbox.Button className="relative w-full cursor-default rounded-lg bg-white py-3 pl-4 pr-10 text-left border border-gray-200 shadow-sm hover:border-primary/50 transition-colors focus:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20">
                    <span className="block truncate text-gray-900">
                      {selectedCategory?.name || "Select Category"}
                    </span>
                    <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                      <ChevronUpDownIcon
                        className="h-5 w-5 text-gray-400"
                        aria-hidden="true"
                      />
                    </span>
                  </Listbox.Button>
                  <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg bg-white py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none">
                    {categories.map((category) => (
                      <Listbox.Option
                        key={category.id}
                        value={category}
                        className={({ active }) =>
                          `relative cursor-pointer select-none py-3 pl-4 pr-9 ${
                            active
                              ? "bg-primary/5 text-primary"
                              : "text-gray-900"
                          }`
                        }
                      >
                        {category.name}
                      </Listbox.Option>
                    ))}
                  </Listbox.Options>
                </div>
              </Listbox>
            </div>

            <div className="w-1/2">
              <label className="block text-sm font-medium text-gray-700">
                Program
              </label>
              <Listbox value={selectedProgram} onChange={setSelectedProgram}>
                <div className="relative mt-1">
                  <Listbox.Button className="relative w-full cursor-default rounded-lg bg-white py-3 pl-4 pr-10 text-left border border-gray-200 shadow-sm hover:border-primary/50 transition-colors focus:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20">
                    <span className="block truncate text-gray-900">
                      {selectedProgram?.name || "Select Program"}
                    </span>
                    <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                      <ChevronUpDownIcon
                        className="h-5 w-5 text-gray-400"
                        aria-hidden="true"
                      />
                    </span>
                  </Listbox.Button>
                  <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg bg-white py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none">
                    {programs.map((program) => (
                      <Listbox.Option
                        key={program.programId}
                        value={program}
                        className={({ active }) =>
                          `relative cursor-pointer select-none py-3 pl-4 pr-9 ${
                            active
                              ? "bg-primary/5 text-primary"
                              : "text-gray-900"
                          }`
                        }
                      >
                        {program.name}
                      </Listbox.Option>
                    ))}
                  </Listbox.Options>
                </div>
              </Listbox>
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700">
                Trusted Circle (Optional)
              </label>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={endorserInput}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEndorserInput(e.target.value)
                  }
                  placeholder="Enter endorser address"
                  className="flex-1 rounded-lg border border-gray-200 px-4 py-3 text-sm shadow-sm hover:border-primary/50 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
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
                  <span className="text-sm font-medium truncate max-w-[200px]">
                    {endorser}
                  </span>
                  <button
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
            <div className="space-y-3 bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
              <div className="space-y-1">
                <h3 className="text-lg font-semibold text-gray-900">
                  Impact Distribution
                </h3>
                <p className="text-sm text-gray-600">
                  Adjust the sliders to set the weight for each indicators.
                </p>
              </div>
              <div className="space-y-8">
                {selectedCategoryIndicators.map((indicator) => (
                  <div key={indicator.id} className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-gray-900">
                        {indicator.name}
                      </span>
                      <span className="font-medium text-primary">
                        {Math.round(indicatorDistribution[indicator.id] * 100)}%
                      </span>
                    </div>
                    <Slider.Root
                      className="relative flex w-full touch-none select-none items-center py-2"
                      value={[indicatorDistribution[indicator.id] * 100]}
                      onValueChange={(values) =>
                        handleIndicatorDistributionChange(
                          indicator.id,
                          values[0] / 100
                        )
                      }
                      max={100}
                      step={1}
                    >
                      <Slider.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-primary-100">
                        <Slider.Range className="absolute h-full bg-primary-500" />
                      </Slider.Track>
                      <Slider.Thumb className="block h-4 w-4 rounded-full border border-primary/50 bg-white shadow-sm transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary/20" />
                    </Slider.Root>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <Button
              onClick={handleSearch}
              className="w-3xl px-8 py-3 text-base font-medium relative"
              disabled={!selectedCategory || !selectedProgram || isSearching}
            >
              {isSearching ? (
                <>
                  <span className="opacity-0">Discover Projects</span>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
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
        {projectResults.length > 0 ? (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold text-gray-900">
                Discovery Results
              </h3>
              <span className="text-sm text-gray-600">
                {projectResults.length} projects found
              </span>
            </div>
            <div className="grid grid-cols-1 gap-6">
              {projectResults.map((result) => (
                <div
                  key={result.project.projectUID}
                  className="rounded-xl flex flex-col gap-4 border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow relative"
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex flex-col gap-2">
                      <Link
                        href={`/project/${result.project.projectSlug}`}
                        className="text-2xl font-bold text-gray-900 line-clamp-2"
                      >
                        {result.project.projectTitle}
                      </Link>
                      <div className="space-y-2">
                        <Link
                          href={`/project/${result.project.projectSlug}/funding/${result.project.grantUID}`}
                          className="text-md text-gray-600"
                        >
                          {result.project.grantTitle}
                        </Link>
                      </div>
                    </div>
                    <div className="flex flex-col items-end justify-center">
                      <button
                        onClick={() =>
                          handleScoreClick(result.project.projectUID)
                        }
                        className="text-2xl text-primary font-bold hover:opacity-80 transition-opacity underline decoration-dotted cursor-pointer"
                        aria-label="Show impact score calculation"
                      >
                        {formatCurrency(result.impactScore)}
                      </button>
                      <span className="text-sm font-medium text-gray-600">
                        Impact Score
                      </span>
                    </div>
                  </div>

                  {activeCalculation === result.project.projectUID && (
                    <div className="absolute right-0 top-16 z-10 w-80 bg-white rounded-lg shadow-lg border border-gray-200 p-4">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="text-sm font-medium text-gray-700">
                          Impact Score Calculation
                        </h4>
                        <button
                          onClick={() => setActiveCalculation(null)}
                          className="text-gray-400 hover:text-gray-600"
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
                            <span className="text-gray-600">
                              {impact.indicatorName}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-gray-500">
                                {formatCurrency(impact.avgValue)}
                              </span>
                              <span className="text-gray-400">×</span>
                              <span className="text-primary">
                                {Math.round(
                                  indicatorDistribution[
                                    impact.impactIndicatorId
                                  ] * 100
                                )}
                                %
                              </span>
                              <span className="text-gray-400">=</span>
                              <span className="font-medium text-gray-900">
                                {formatCurrency(
                                  impact.avgValue *
                                    indicatorDistribution[
                                      impact.impactIndicatorId
                                    ]
                                )}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex w-full flex-col items-start justify-center h-[400px] text-gray-500 pl-12 border-l border-l-zinc-400 ml-10">
            <p className="text-lg">No projects discovered yet</p>
            <p className="text-sm">
              Use the filters on the left to discover projects
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
