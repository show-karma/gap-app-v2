import { Dialog, Transition } from "@headlessui/react";
import { ChevronDownIcon, PlusIcon, TrashIcon, XMarkIcon } from "@heroicons/react/24/outline";
import Image from "next/image";
import { Fragment, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useAccount } from "wagmi";
import { DeleteDialog } from "@/components/DeleteDialog";
import { LoadingSpinner } from "@/components/Disbursement/components/LoadingSpinner";
import { IndicatorForm } from "@/components/Forms/IndicatorForm";
import { Button } from "@/components/Utilities/Button";
import { errorManager } from "@/components/Utilities/errorManager";
import { useGroupedIndicators } from "@/hooks/useGroupedIndicators";
import type { Category, ImpactIndicator, ImpactIndicatorWithData } from "@/types/impactMeasurement";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { MESSAGES } from "@/utilities/messages";

// Custom Dropdown Menu Component - copied from CategoryView.tsx
const DropdownMenu = ({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const selectedOption = options.find((option) => option.value === value);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-3 py-2 text-sm font-medium bg-white dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-zinc-700 focus:outline-none"
      >
        <span>{selectedOption?.label || "Select option"}</span>
        <ChevronDownIcon
          className={`ml-2 h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 z-10 mt-1 w-full bg-white dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 rounded-md shadow-lg">
          <div className="py-1">
            {options.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`block w-full text-left px-4 py-2 text-sm ${
                  value === option.value
                    ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-700"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

interface IndicatorsViewProps {
  categories: Category[];
  onRefresh?: () => Promise<void>;
  communityId?: string;
}

export const IndicatorsView = ({ categories, onRefresh, communityId }: IndicatorsViewProps) => {
  const { address } = useAccount();
  const [indicatorViewType, setIndicatorViewType] = useState<"all" | "automated" | "manual">("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [formDefaultValues, setFormDefaultValues] = useState<Partial<any>>({
    name: "",
    description: "",
    unitOfMeasure: "int",
    programs: [],
  });
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [newIndicators, setNewIndicators] = useState<ImpactIndicator[]>([]);

  // Filter options for dropdown - same format as CategoryView.tsx
  const filterOptions = [
    { value: "all", label: "All" },
    { value: "automated", label: "Automated" },
    { value: "manual", label: "Manual" },
  ];

  // Use the indicators hook instead of direct fetch
  const {
    data: groupedIndicators = { communityAdminCreated: [], projectOwnerCreated: [] },
    refetch: refetchIndicators,
    isLoading,
  } = useGroupedIndicators({
    communityId: communityId || "",
  });

  // Handle indicator creation success
  const handleIndicatorCreated = (_indicator: ImpactIndicatorWithData) => {
    refetchIndicators(); // Use the hook's refetch method

    if (onRefresh) {
      onRefresh();
    }

    toast.success("Indicator created successfully");
  };

  // Handle indicator deletion
  const handleDeleteIndicator = async (id: string) => {
    try {
      setIsDeletingId(id);
      const [, error] = await fetchData(INDEXER.INDICATORS.DELETE(id), "DELETE");
      if (error) throw error;

      // Refresh indicators using the hook's refetch method
      await refetchIndicators();

      // Also call the parent refresh if provided
      if (onRefresh) {
        await onRefresh();
      }

      toast.success("Indicator deleted successfully");
    } catch (error) {
      errorManager(
        "Failed to delete indicator",
        error,
        {
          indicatorId: id,
          address,
        },
        { error: MESSAGES.INDICATOR.DELETE.ERROR }
      );
    } finally {
      setIsDeletingId(null);
    }
  };

  // Total indicators count
  const getTotalIndicatorsCount = () => {
    return (
      groupedIndicators.communityAdminCreated.length +
      groupedIndicators.projectOwnerCreated.length +
      newIndicators.length
    );
  };

  // Check if an indicator is autosynced (based on syncType field)
  const isAutosyncedIndicator = (indicator: ImpactIndicator) => {
    return indicator.syncType === "auto";
  };

  // Filter indicators based on search and view type
  const getFilteredIndicators = (indicators: ImpactIndicator[]): ImpactIndicator[] => {
    let filteredIndicators = [...indicators];

    if (indicatorViewType === "automated") {
      filteredIndicators = filteredIndicators.filter((ind) => isAutosyncedIndicator(ind));
    } else if (indicatorViewType === "manual") {
      filteredIndicators = filteredIndicators.filter((ind) => !isAutosyncedIndicator(ind));
    }

    if (searchQuery) {
      filteredIndicators = filteredIndicators.filter(
        (indicator) =>
          indicator.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          indicator.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filteredIndicators.sort((a, b) =>
      a.name.toLowerCase().localeCompare(b.name.toLowerCase())
    );
  };

  const filteredCommunityAdminIndicators = getFilteredIndicators(
    groupedIndicators.communityAdminCreated
  );
  const filteredProjectOwnerIndicators = getFilteredIndicators(
    groupedIndicators.projectOwnerCreated
  );

  const hasIndicators = getTotalIndicatorsCount() > 0;
  const hasFilteredIndicators =
    filteredCommunityAdminIndicators.length > 0 || filteredProjectOwnerIndicators.length > 0;
  const isFiltering = searchQuery || indicatorViewType !== "all";

  const renderIndicatorsList = (
    indicators: ImpactIndicator[],
    title: string,
    allowDelete: boolean = true
  ) => {
    if (indicators.length === 0 && !isFiltering) {
      return null;
    }

    return (
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
          {title} ({indicators.length})
        </h2>
        {indicators.length > 0 ? (
          <div className="grid grid-cols-1 gap-0 rounded border border-gray-300 dark:border-zinc-700 divide-y divide-gray-300 dark:divide-zinc-700">
            {indicators.map((indicator) => (
              <div key={indicator.id} className="p-5 flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {indicator.name}
                  </h3>
                  {indicator.description && (
                    <p className="text-gray-900 text-base font-normal dark:text-gray-400 mt-1">
                      {indicator.description}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="text-xs bg-white dark:bg-zinc-800 px-2 py-0.5 rounded-full border border-gray-200 dark:border-zinc-700 inline-block">
                      {indicator.unitOfMeasure || "N/A"}
                    </span>
                    {indicator.syncType === "auto" && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 rounded-full inline-block">
                        Auto
                      </span>
                    )}
                  </div>
                </div>
                {allowDelete && (
                  <DeleteDialog
                    title={`Are you sure you want to delete ${indicator.name}?`}
                    deleteFunction={() => handleDeleteIndicator(indicator.id)}
                    isLoading={isDeletingId === indicator.id}
                    buttonElement={{
                      icon: <TrashIcon className="h-5 w-5" />,
                      text: "",
                      styleClass:
                        "text-red-500 hover:text-red-700 transition-colors p-1.5 bg-transparent hover:bg-transparent hover:opacity-75",
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 px-8 flex flex-col items-center justify-center text-center rounded border border-gray-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800">
            <p className="text-gray-500 dark:text-gray-400">
              No {title.toLowerCase()} found with current filters.
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full">
      {/* Indicators Header */}
      <div className="flex p-4 justify-between items-center mb-6 rounded border border-gray-300 dark:border-zinc-700">
        <div className="flex flex-row gap-4 items-center">
          <div className="flex items-center justify-center w-10 h-10 rounded-sm bg-indigo-50 dark:bg-zinc-800">
            <Image
              alt="Indicators"
              width={24}
              height={24}
              src="/icons/bars.svg"
              className="text-[#8098F9]"
            />
          </div>
          <h1 className="text-2xl font-bold">Indicators ({getTotalIndicatorsCount()})</h1>
        </div>
        <Button
          className="flex items-center gap-1 text-white"
          onClick={() => setIsFormModalOpen(true)}
        >
          Add Indicator
          <PlusIcon className="h-4 w-4" />
        </Button>
      </div>

      {isLoading ? (
        <LoadingSpinner size="lg" color="blue" message="Loading indicators..." />
      ) : (
        <>
          {hasIndicators && (
            <div className="flex justify-between items-center mb-6">
              <div className="w-2/3">
                <input
                  type="text"
                  placeholder="Search indicators..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 border rounded-md dark:bg-zinc-800 dark:border-zinc-700"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">View</span>
                <div className="w-36">
                  <DropdownMenu
                    value={indicatorViewType}
                    onChange={(value: any) =>
                      setIndicatorViewType(value as "all" | "automated" | "manual")
                    }
                    options={filterOptions}
                  />
                </div>
              </div>
            </div>
          )}

          {!hasIndicators && (
            <div className="py-12 px-8 flex flex-col items-center justify-center text-center">
              <div className="bg-gray-100 dark:bg-zinc-800 p-3 rounded-full mb-4">
                <Image
                  alt="No indicators"
                  width={32}
                  height={32}
                  src="/icons/bars.svg"
                  className="text-indigo-500"
                />
              </div>
              <h3 className="text-lg font-semibold mb-2">No indicators yet</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4 max-w-lg">
                Get started by creating your first indicator to track impact measurements.
              </p>
              <Button
                className="flex items-center gap-1 text-white"
                onClick={() => setIsFormModalOpen(true)}
              >
                Add Indicator
                <PlusIcon className="h-4 w-4" />
              </Button>
            </div>
          )}

          {hasIndicators && !hasFilteredIndicators && (
            <div className="py-12 px-8 flex flex-col items-center justify-center text-center">
              <div className="bg-gray-100 dark:bg-zinc-800 p-3 rounded-full mb-4">
                <Image
                  alt="No results"
                  width={32}
                  height={32}
                  src="/icons/search.svg"
                  className="text-indigo-500"
                />
              </div>
              <h3 className="text-lg font-semibold mb-2">No indicators found</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4 max-w-lg">
                {searchQuery ? (
                  <>No indicators match your search term. Try a different search.</>
                ) : indicatorViewType !== "all" ? (
                  <>No {indicatorViewType} indicators found. Try a different filter.</>
                ) : (
                  <>No indicators match your current filters.</>
                )}
              </p>
              {searchQuery && (
                <Button variant="secondary" className="mb-2" onClick={() => setSearchQuery("")}>
                  Clear Search
                </Button>
              )}
              {indicatorViewType !== "all" && (
                <Button variant="secondary" onClick={() => setIndicatorViewType("all")}>
                  Show All Indicators
                </Button>
              )}
            </div>
          )}

          {hasFilteredIndicators && (
            <div>
              {renderIndicatorsList(filteredCommunityAdminIndicators, "Community Admin Indicators")}
              {renderIndicatorsList(
                filteredProjectOwnerIndicators,
                "Project Owner Indicators",
                false
              )}
            </div>
          )}
        </>
      )}

      {/* Modal for creating new indicator */}
      <Transition appear show={isFormModalOpen} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-50"
          onClose={() => {
            setIsFormModalOpen(false);
            // Reset form values when closing modal
            setFormDefaultValues({
              name: "",
              description: "",
              unitOfMeasure: "int",
              programs: [],
            });
          }}
        >
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-lg bg-white dark:bg-zinc-800 p-6 text-left align-middle shadow-xl transition-all">
                  <div className="flex justify-between items-center mb-4">
                    <Dialog.Title
                      as="h3"
                      className="text-lg font-medium leading-6 text-gray-900 dark:text-white"
                    >
                      Create New Indicator
                    </Dialog.Title>
                    <button
                      onClick={() => {
                        setIsFormModalOpen(false);
                        setFormDefaultValues({
                          name: "",
                          description: "",
                          unitOfMeasure: "int",
                          programs: [],
                        });
                      }}
                      className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </div>

                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    Create a custom indicator for your community. For system metrics like GitHub
                    stats or transactions, use the &quot;Default&quot; indicators when creating
                    activities or outcomes.
                  </p>

                  <IndicatorForm
                    communityId={communityId}
                    defaultValues={formDefaultValues}
                    onSuccess={(indicator) => {
                      // Add the new indicator to our local state
                      setNewIndicators((prev) => [...prev, indicator]);

                      // Reset form values
                      setFormDefaultValues({
                        name: "",
                        description: "",
                        unitOfMeasure: "int",
                        programs: [],
                      });

                      // Handle success
                      handleIndicatorCreated(indicator);

                      // Close the form modal
                      setIsFormModalOpen(false);
                    }}
                    onError={() => {
                      toast.error("Failed to create indicator");
                    }}
                    preventPropagation={true}
                  />
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
};
