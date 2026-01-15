import { Dialog, Transition } from "@headlessui/react";
import {
  ChevronDownIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  SparklesIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import * as Popover from "@radix-ui/react-popover";
import { type FC, Fragment, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { LoadingSpinner } from "@/components/Disbursement/components/LoadingSpinner";
import { IndicatorForm } from "@/components/Forms/IndicatorForm";
import { Button } from "@/components/Utilities/Button";
import { useAutosyncedIndicators } from "@/hooks/useAutosyncedIndicators";
import type { ImpactIndicator } from "@/types/impactMeasurement";

interface IndicatorsDropdownProps {
  selectedIndicators: string[];
  indicators: ImpactIndicator[];
  onIndicatorChange: (value: string) => void;
  communityId?: string;
  onIndicatorCreated?: (indicator: any) => void;
  isLoading?: boolean;
}

export const IndicatorsDropdown: FC<IndicatorsDropdownProps> = ({
  selectedIndicators,
  indicators,
  onIndicatorChange,
  communityId,
  onIndicatorCreated,
  isLoading = false,
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [newIndicators, setNewIndicators] = useState<ImpactIndicator[]>([]);
  const [activeTab, setActiveTab] = useState<"community" | "default">("community");

  // Fetch auto-synced indicators from API
  const { data: autosyncedIndicators = [], isLoading: isLoadingAutosynced } =
    useAutosyncedIndicators();

  // Combine the original indicators with any newly created ones
  const allCommunityIndicators = useMemo(() => {
    const combined = [...indicators, ...newIndicators];
    // Sort alphabetically
    return combined.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
  }, [indicators, newIndicators]);

  // Filter community indicators based on search
  const filteredCommunityIndicators = useMemo(() => {
    if (!search) return allCommunityIndicators;
    const searchLower = search.toLowerCase();
    return allCommunityIndicators.filter(
      (indicator) =>
        indicator.name.toLowerCase().includes(searchLower) ||
        indicator.description?.toLowerCase().includes(searchLower)
    );
  }, [allCommunityIndicators, search]);

  // Filter default/auto indicators based on search
  const filteredDefaultIndicators = useMemo(() => {
    const sorted = [...autosyncedIndicators].sort((a, b) =>
      a.name.toLowerCase().localeCompare(b.name.toLowerCase())
    );
    if (!search) return sorted;
    const searchLower = search.toLowerCase();
    return sorted.filter(
      (indicator) =>
        indicator.name.toLowerCase().includes(searchLower) ||
        indicator.description?.toLowerCase().includes(searchLower)
    );
  }, [autosyncedIndicators, search]);

  // Get selected indicator names for display
  const selectedNames = useMemo(() => {
    const allIndicators = [...allCommunityIndicators, ...autosyncedIndicators];
    return selectedIndicators
      .map((id) => allIndicators.find((i) => i.id === id)?.name)
      .filter(Boolean);
  }, [selectedIndicators, allCommunityIndicators, autosyncedIndicators]);

  // Clear search when dropdown closes
  useEffect(() => {
    if (!open) {
      setSearch("");
    }
  }, [open]);

  const renderIndicatorItem = (indicator: ImpactIndicator, isDefault = false) => {
    const isSelected = selectedIndicators.includes(indicator.id);

    return (
      <button
        key={indicator.id}
        type="button"
        className="px-4 py-3 w-full hover:bg-gray-50 dark:hover:bg-zinc-700 cursor-pointer flex justify-between items-center gap-3 text-left"
        onClick={() => onIndicatorChange(indicator.id)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-sm truncate">{indicator.name}</p>
            {isDefault && (
              <span className="flex-shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                <SparklesIcon className="w-3 h-3 mr-0.5" />
                Auto
              </span>
            )}
          </div>
          {indicator.description && (
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
              {indicator.description}
            </p>
          )}
        </div>
        <div
          className={`${
            isSelected ? "bg-blue-600" : "bg-gray-200 dark:bg-zinc-700"
          } relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors`}
          aria-hidden="true"
        >
          <span
            className={`${
              isSelected ? "translate-x-6" : "translate-x-1"
            } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
          />
        </div>
      </button>
    );
  };

  const renderEmptyState = (isDefault: boolean) => (
    <div className="px-4 py-8 text-sm text-gray-500 dark:text-gray-400 text-center flex flex-col items-center">
      <MagnifyingGlassIcon className="h-8 w-8 mb-2 text-gray-300 dark:text-gray-600" />
      <p className="font-medium">No indicators found</p>
      <p className="text-xs mt-1">
        {search
          ? "Try a different search term"
          : isDefault
            ? "No default indicators available"
            : "Create a custom indicator to get started"}
      </p>
      {!isDefault && !search && (
        <Button
          onClick={() => {
            setOpen(false);
            setIsFormModalOpen(true);
          }}
          variant="secondary"
          className="mt-4 text-xs py-1.5 px-4"
        >
          <PlusIcon className="w-4 h-4 mr-1" />
          Create Custom Indicator
        </Button>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-2 w-full">
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild>
          <button
            type="button"
            className="flex w-full items-center justify-between px-3 py-3 text-sm font-medium bg-white dark:bg-zinc-800 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-zinc-700 focus:outline-none text-left"
            disabled={isLoading}
          >
            <span className="truncate">
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <LoadingSpinner size="sm" color="gray" />
                  Loading indicators...
                </span>
              ) : selectedIndicators.length > 0 ? (
                selectedNames.length <= 2 ? (
                  selectedNames.join(", ")
                ) : (
                  `${selectedIndicators.length} indicators selected`
                )
              ) : (
                "Select indicators"
              )}
            </span>
            <ChevronDownIcon
              className={`ml-2 h-4 w-4 text-gray-400 transition-transform ${
                open ? "rotate-180" : ""
              }`}
            />
          </button>
        </Popover.Trigger>

        <Popover.Portal>
          <Popover.Content
            className="mt-1 w-[var(--radix-popover-trigger-width)] z-50 bg-white border border-zinc-200 dark:border-zinc-700 rounded-lg dark:text-white dark:bg-zinc-800 overflow-hidden shadow-xl"
            align="start"
            side="bottom"
            sideOffset={5}
            sticky="always"
          >
            {/* Header */}
            <div className="flex justify-between items-center p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-zinc-900">
              <span className="text-slate-700 text-sm font-semibold dark:text-gray-300">
                Assign Indicators
                {selectedIndicators.length > 0 && (
                  <span className="ml-2 text-blue-600 dark:text-blue-400">
                    ({selectedIndicators.length} selected)
                  </span>
                )}
              </span>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setIsFormModalOpen(true);
                }}
                className="inline-flex items-center text-blue-600 dark:text-blue-400 text-sm font-medium hover:text-blue-700 dark:hover:text-blue-300"
              >
                <PlusIcon className="w-4 h-4 mr-1" />
                Create Custom
              </button>
            </div>

            {/* Search */}
            <div className="p-2 border-b border-gray-200 dark:border-gray-700">
              <div className="relative">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-zinc-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Search indicators..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => setActiveTab("community")}
                className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
                  activeTab === "community"
                    ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                Community
                <span className="ml-1.5 text-xs text-gray-400">
                  ({filteredCommunityIndicators.length})
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("default")}
                className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
                  activeTab === "default"
                    ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                <SparklesIcon className="w-4 h-4 inline mr-1" />
                Default
                <span className="ml-1.5 text-xs text-gray-400">
                  ({filteredDefaultIndicators.length})
                </span>
              </button>
            </div>

            {/* Content */}
            <div className="max-h-64 overflow-y-auto">
              {isLoading || isLoadingAutosynced ? (
                <div className="py-8">
                  <LoadingSpinner size="md" color="blue" message="Loading indicators..." />
                </div>
              ) : activeTab === "community" ? (
                filteredCommunityIndicators.length === 0 ? (
                  renderEmptyState(false)
                ) : (
                  <div className="divide-y divide-gray-100 dark:divide-gray-700">
                    {filteredCommunityIndicators.map((indicator) =>
                      renderIndicatorItem(indicator, false)
                    )}
                  </div>
                )
              ) : filteredDefaultIndicators.length === 0 ? (
                renderEmptyState(true)
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {filteredDefaultIndicators.map((indicator) =>
                    renderIndicatorItem(indicator, true)
                  )}
                </div>
              )}
            </div>

            <Popover.Arrow className="fill-white dark:fill-zinc-800" />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

      {/* Modal for creating CUSTOM indicator only */}
      <Transition appear show={isFormModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setIsFormModalOpen(false)}>
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
                      className="text-lg font-semibold text-gray-900 dark:text-white"
                    >
                      Create Custom Indicator
                    </Dialog.Title>
                    <button
                      type="button"
                      onClick={() => setIsFormModalOpen(false)}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </div>

                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    Create a new custom indicator for your community. For system metrics like GitHub
                    stats or transactions, use the &quot;Default&quot; tab instead.
                  </p>

                  <IndicatorForm
                    communityId={communityId}
                    defaultValues={{
                      name: "",
                      description: "",
                      unitOfMeasure: "int",
                      programs: [],
                    }}
                    onSuccess={(indicator) => {
                      // Add the new indicator to local state
                      setNewIndicators((prev) => [...prev, indicator]);

                      // Notify parent
                      if (onIndicatorCreated) {
                        setTimeout(() => onIndicatorCreated(indicator), 0);
                      }

                      // Close modal and reopen dropdown
                      setIsFormModalOpen(false);
                      setTimeout(() => setOpen(true), 10);
                    }}
                    onError={(error) => {
                      toast.error(
                        error instanceof Error ? error.message : "Failed to create indicator"
                      );
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
