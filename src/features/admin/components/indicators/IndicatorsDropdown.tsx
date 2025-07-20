import {
  CheckIcon,
  ChevronDownIcon,
  MagnifyingGlassIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import * as Popover from "@radix-ui/react-popover";
import { FC, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { IndicatorForm } from "@/features/admin/components/forms/indicator-form";
import { Dialog, Transition } from "@headlessui/react";
import { Fragment } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { Switch } from "@headlessui/react";
import { autosyncedIndicators } from "@/features/admin/components/indicators/IndicatorsHub";
import { LoadingSpinner } from "@/features/disbursements/components/components/LoadingSpinner";
import { ImpactIndicator } from "@/features/impact/types";

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
  const [selectedAutosynced, setSelectedAutosynced] = useState<string>("");
  const [formDefaultValues, setFormDefaultValues] = useState<Partial<any>>({
    name: "",
    description: "",
    unitOfMeasure: "int",
    programs: [],
  });

  // Combine the original indicators with any newly created ones
  const allIndicators = [...indicators, ...newIndicators];

  // Sort all indicators alphabetically by name
  const sortedIndicators = [...allIndicators].sort((a, b) =>
    a.name.toLowerCase().localeCompare(b.name.toLowerCase())
  );

  // Filter indicators based on search - use sorted indicators now
  const filteredIndicators = sortedIndicators.filter(
    (indicator) =>
      indicator.name.toLowerCase().includes(search.toLowerCase()) ||
      indicator.unitOfMeasure?.toLowerCase().includes(search.toLowerCase())
  );

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

  // Clear search when dropdown closes
  useEffect(() => {
    if (!open) {
      setSearch("");
    }
  }, [open]);

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
                `${selectedIndicators.length} indicator${
                  selectedIndicators.length > 1 ? "s" : ""
                } selected`
              ) : (
                "Search for indicators"
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
            className="mt-1 w-[var(--radix-popover-trigger-width)] z-50 bg-white border border-zinc-200 dark:border-zinc-700 rounded-md dark:text-white dark:bg-zinc-800 overflow-hidden shadow-lg"
            align="start"
            side="bottom"
            sideOffset={5}
            sticky="always"
          >
            <div className="flex justify-between items-center p-3 border-b border-gray-200 dark:border-gray-700">
              <span className="text-slate-700 text-sm font-bold dark:text-gray-300">
                Selected Indicators ({selectedIndicators.length})
              </span>
              <button
                onClick={() => setIsFormModalOpen(true)}
                className="text-blue-600 dark:text-blue-200 text-sm font-semibold p-1"
              >
                Add indicator
              </button>
            </div>

            <div className="p-2 border-b border-gray-200 dark:border-gray-700">
              <div className="relative">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-zinc-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Search for indicators"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  autoFocus
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="max-h-60 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700">
              {isLoading ? (
                <LoadingSpinner
                  size="md"
                  color="blue"
                  message="Loading indicators..."
                />
              ) : filteredIndicators.length === 0 ? (
                <div className="px-4 py-6 text-sm text-gray-500 dark:text-gray-400 text-center flex flex-col items-center">
                  <MagnifyingGlassIcon className="h-6 w-6 mb-2 text-gray-400" />
                  <p>No indicators found</p>
                  <Button
                    onClick={() => {
                      setOpen(false);
                      setIsFormModalOpen(true);
                    }}
                    variant="secondary"
                    className="mt-3 text-xs py-1 px-3"
                  >
                    Create new indicator
                  </Button>
                </div>
              ) : (
                filteredIndicators.map((indicator) => (
                  <button
                    key={indicator.id}
                    className="px-4 py-3 w-full flex-1 hover:bg-gray-50 dark:hover:bg-zinc-700 cursor-pointer flex justify-between items-center"
                    onClick={() => onIndicatorChange(indicator.id)}
                  >
                    <div className="flex-1 text-left">
                      <p className="font-medium text-sm">{indicator.name}</p>
                    </div>
                    <Switch
                      checked={selectedIndicators.includes(indicator.id)}
                      onChange={() => onIndicatorChange(indicator.id)}
                      className={`${
                        selectedIndicators.includes(indicator.id)
                          ? "bg-blue-600"
                          : "bg-gray-200 dark:bg-zinc-700"
                      } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2`}
                    >
                      <span
                        className={`${
                          selectedIndicators.includes(indicator.id)
                            ? "translate-x-6"
                            : "translate-x-1"
                        } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                      />
                    </Switch>
                  </button>
                ))
              )}
            </div>

            <Popover.Arrow className="fill-white dark:fill-zinc-800" />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

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

                      // Only notify parent of new indicator without causing form submission
                      if (onIndicatorCreated) {
                        // Use setTimeout to break the event chain
                        setTimeout(() => {
                          onIndicatorCreated(indicator);
                        }, 0);
                      }

                      // Close the form modal
                      setIsFormModalOpen(false);

                      // Keep dropdown open
                      setTimeout(() => {
                        setOpen(true);
                      }, 10);
                    }}
                    onError={() => {
                      // Handle error
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
