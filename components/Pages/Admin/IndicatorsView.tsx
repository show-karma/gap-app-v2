import { Button } from "@/components/Utilities/Button";
import {
  Category,
  ImpactIndicator,
  ImpactIndicatorWithData,
} from "@/types/impactMeasurement";
import {
  TrashIcon,
  PlusIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";
import { useState, Fragment, useRef, useEffect } from "react";
import Image from "next/image";
import { Dialog, Transition } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { IndicatorForm } from "@/components/Forms/IndicatorForm";
import { autosyncedIndicators } from "@/components/Pages/Admin/IndicatorsHub";
import { DeleteDialog } from "@/components/DeleteDialog";
import toast from "react-hot-toast";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { errorManager } from "@/components/Utilities/errorManager";
import { useIndicators } from "@/hooks/useIndicators";

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
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
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
          className={`ml-2 h-4 w-4 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
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

export const IndicatorsView = ({
  categories,
  onRefresh,
  communityId,
}: IndicatorsViewProps) => {
  const [indicatorViewType, setIndicatorViewType] = useState<
    "all" | "automated" | "manual"
  >("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [selectedAutosynced, setSelectedAutosynced] = useState<string>("");
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
    data: apiIndicators = [],
    refetch: refetchIndicators,
    isLoading,
  } = useIndicators({
    communityId: communityId || "",
  });

  // Handle autosynced indicator selection
  const handleAutosyncedSelect = (name: string) => {
    if (!name) {
      setFormDefaultValues({
        name: "",
        description: "",
        unitOfMeasure: "int",
        programs: [],
      });
      setSelectedAutosynced("");
      return;
    }

    const selectedIndicator = autosyncedIndicators.find((i) => i.name === name);
    if (selectedIndicator) {
      setFormDefaultValues({
        name: selectedIndicator.name,
        description: selectedIndicator.description,
        unitOfMeasure: selectedIndicator.unitOfMeasure as "float" | "int",
        programs: [],
      });
      setSelectedAutosynced(name);
    }
  };

  // Handle indicator creation success
  const handleIndicatorCreated = (indicator: ImpactIndicatorWithData) => {
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
      const [, error] = await fetchData(
        INDEXER.INDICATORS.DELETE(id),
        "DELETE"
      );
      if (error) throw error;

      // Refresh indicators using the hook's refetch method
      await refetchIndicators();

      // Also call the parent refresh if provided
      if (onRefresh) {
        await onRefresh();
      }

      toast.success("Indicator deleted successfully");
    } catch (error) {
      errorManager("Failed to delete indicator", error);
      toast.error("Failed to delete indicator");
    } finally {
      setIsDeletingId(null);
    }
  };

  // Total indicators count
  const getTotalIndicatorsCount = () => {
    let count = apiIndicators.length;

    // Also count any newly created indicators not yet in the API response
    const existingIds = new Set(apiIndicators.map((ind) => ind.id));
    const uniqueNewIndicators = newIndicators.filter(
      (ind) => !existingIds.has(ind.id)
    );
    count += uniqueNewIndicators.length;

    return count;
  };

  // Check if an indicator is autosynced
  const isAutosyncedIndicator = (indicator: ImpactIndicator) => {
    return autosyncedIndicators.some((i) => i.name === indicator.name);
  };

  // Filter indicators based on search and view type
  const getFilteredIndicators = (): ImpactIndicator[] => {
    // Combine API indicators with any newly created ones
    let allIndicators: ImpactIndicator[] = [...apiIndicators];

    // Add any new indicators that aren't yet in the API response
    const existingIds = new Set(allIndicators.map((ind) => ind.id));
    const uniqueNewIndicators = newIndicators.filter(
      (ind) => !existingIds.has(ind.id)
    );
    allIndicators = [...allIndicators, ...uniqueNewIndicators];

    // Filter by view type (automated/manual)
    if (indicatorViewType === "automated") {
      allIndicators = allIndicators.filter((ind) => isAutosyncedIndicator(ind));
    } else if (indicatorViewType === "manual") {
      allIndicators = allIndicators.filter(
        (ind) => !isAutosyncedIndicator(ind)
      );
    }

    // Filter by search query
    if (searchQuery) {
      allIndicators = allIndicators.filter(
        (indicator) =>
          indicator.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (indicator.description &&
            indicator.description
              .toLowerCase()
              .includes(searchQuery.toLowerCase()))
      );
    }

    // Sort indicators alphabetically
    return allIndicators.sort((a, b) =>
      a.name.toLowerCase().localeCompare(b.name.toLowerCase())
    );
  };

  const hasIndicators = getTotalIndicatorsCount() > 0;
  const filteredIndicators = getFilteredIndicators();
  const hasFilteredIndicators = filteredIndicators.length > 0;
  const isFiltering = searchQuery || indicatorViewType !== "all";

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
          <h1 className="text-2xl font-bold">
            Indicators ({getTotalIndicatorsCount()})
          </h1>
        </div>
        <Button
          className="flex items-center gap-1 text-white"
          onClick={() => setIsFormModalOpen(true)}
        >
          Add Indicator
          <PlusIcon className="h-4 w-4" />
        </Button>
      </div>

      {/* Search and Filters - Only show if there are indicators */}
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
          {/* Replace the select with the DropdownMenu component */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              View
            </span>
            <div className="w-36">
              <DropdownMenu
                value={indicatorViewType}
                onChange={(value) =>
                  setIndicatorViewType(value as "all" | "automated" | "manual")
                }
                options={filterOptions}
              />
            </div>
          </div>
        </div>
      )}

      {/* Empty State - No indicators at all */}
      {!hasIndicators && (
        <div className="py-16 px-8 flex flex-col items-center justify-center text-center">
          <div className="bg-gray-100 dark:bg-zinc-800 p-4 rounded-full mb-4">
            <Image
              alt="Empty state"
              width={40}
              height={40}
              src="/icons/chart-bar.svg"
              className="text-indigo-500"
            />
          </div>
          <h3 className="text-xl font-semibold mb-2">No indicators yet</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-lg">
            Indicators help you measure the impact of your activities and
            outcomes. Add your first indicator to start tracking impact.
          </p>
          <Button
            className="flex items-center gap-1 text-white"
            onClick={() => setIsFormModalOpen(true)}
          >
            Add Your First Indicator
            <PlusIcon className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Filter Empty State - Has indicators but none match filter */}
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
              <>
                No {indicatorViewType} indicators found. Try a different filter.
              </>
            ) : (
              <>No indicators match your current filters.</>
            )}
          </p>
          {searchQuery && (
            <Button
              variant="secondary"
              className="mb-2"
              onClick={() => setSearchQuery("")}
            >
              Clear Search
            </Button>
          )}
          {indicatorViewType !== "all" && (
            <Button
              variant="secondary"
              onClick={() => setIndicatorViewType("all")}
            >
              Show All Indicators
            </Button>
          )}
        </div>
      )}

      {/* Indicators List - Only show if there are filtered indicators */}
      {hasFilteredIndicators && (
        <div className="grid grid-cols-1 gap-0 rounded border border-gray-300 dark:border-zinc-700 divide-y divide-gray-300 dark:divide-zinc-700">
          {filteredIndicators.map((indicator) => (
            <div
              key={indicator.id}
              className="p-5 flex justify-between items-center"
            >
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {indicator.name}
                </h3>
                {indicator.description && (
                  <p className="text-gray-900 text-base font-normal dark:text-gray-400 mt-1">
                    {indicator.description}
                  </p>
                )}
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                  Unit: {indicator.unitOfMeasure || "N/A"}
                </p>
                {autosyncedIndicators.find(
                  (i) => i.name === indicator.name
                ) && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 rounded-full mt-2 inline-block">
                    Autosynced
                  </span>
                )}
              </div>
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
            </div>
          ))}
        </div>
      )}

      {/* Modal for creating new indicator */}
      <Transition appear show={isFormModalOpen} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-50"
          onClose={() => {
            setIsFormModalOpen(false);
            // Reset form values and selected autosynced when closing modal
            setFormDefaultValues({
              name: "",
              description: "",
              unitOfMeasure: "int",
              programs: [],
            });
            setSelectedAutosynced("");
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
                        setSelectedAutosynced("");
                      }}
                      className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </div>

                  {/* Add autosynced indicator selector */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                      Select Autosynced Indicator (Optional)
                    </label>
                    <select
                      value={selectedAutosynced}
                      onChange={(e) => handleAutosyncedSelect(e.target.value)}
                      className="w-full p-2 border rounded-md bg-gray-50 dark:bg-zinc-900 border-gray-200 dark:border-zinc-700"
                    >
                      <option value="">Create Custom Indicator</option>
                      {autosyncedIndicators.map((indicator) => (
                        <option key={indicator.name} value={indicator.name}>
                          {indicator.description}
                        </option>
                      ))}
                    </select>
                  </div>

                  <IndicatorForm
                    communityId={communityId}
                    defaultValues={formDefaultValues}
                    readOnlyFields={{
                      name: !!selectedAutosynced,
                      description: !!selectedAutosynced,
                      unitOfMeasure: !!selectedAutosynced,
                    }}
                    onSuccess={(indicator) => {
                      // Prevent event bubbling if any
                      if (event) {
                        event.preventDefault();
                        event.stopPropagation();
                      }

                      // Add the new indicator to our local state
                      setNewIndicators((prev) => [...prev, indicator]);

                      // Reset form values and selected autosynced
                      setFormDefaultValues({
                        name: "",
                        description: "",
                        unitOfMeasure: "int",
                        programs: [],
                      });
                      setSelectedAutosynced("");

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
