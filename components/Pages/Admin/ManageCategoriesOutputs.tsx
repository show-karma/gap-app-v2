import { SearchWithValueDropdown } from "@/components/Pages/Communities/Impact/SearchWithValueDropdown";
import { Button } from "@/components/Utilities/Button";
import { errorManager } from "@/components/Utilities/errorManager";
import { useIndicators } from "@/hooks/useIndicators";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { MESSAGES } from "@/utilities/messages";
import { PAGES } from "@/utilities/pages";
import { cn } from "@/utilities/tailwind";
import { ChevronDownIcon, TrashIcon } from "@heroicons/react/24/outline";
import * as Accordion from "@radix-ui/react-accordion";
import { ICommunityResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import Link from "next/link";
import { useState } from "react";
import toast from "react-hot-toast";

const OUTPUT_TYPES = ["output", "outcome"] as const;
type OutputType = (typeof OUTPUT_TYPES)[number];

interface Indicator {
  id: string;
  name: string;
  description: string;
  unitOfMeasure: string;
}

interface Output {
  id: string;
  name: string;
  categoryId: string;
  type: OutputType;
  description?: string;
  indicators?: string[]; // Array of indicator IDs
}

interface Category {
  id: string;
  name: string;
  category: string;
  outputs: Output[];
}

interface ManageCategoriesOutputsProps {
  categories: Category[];
  setCategories: (categories: Category[]) => void;
  community: ICommunityResponse | undefined;
}

export const ManageCategoriesOutputs = ({
  categories,
  setCategories,
  community,
}: ManageCategoriesOutputsProps) => {
  const [newOutputs, setNewOutputs] = useState<Record<string, string>>({});
  const [newOutputDescriptions, setNewOutputDescriptions] = useState<
    Record<string, string>
  >({});
  const [newOutputTypes, setNewOutputTypes] = useState<
    Record<string, OutputType>
  >({});
  const [newOutputIndicators, setNewOutputIndicators] = useState<
    Record<string, string[]>
  >({});
  const [hasOutputChanges, setHasOutputChanges] = useState<
    Record<string, boolean>
  >({});
  const [isSavingOutputs, setIsSavingOutputs] = useState<
    Record<string, boolean>
  >({});

  const { data: indicators = [] } = useIndicators({
    communityId: community?.uid || "",
  });

  const handleAddOutput = (categoryId: string) => {
    if (!newOutputs[categoryId]?.trim()) return;

    const categoryIndex = categories.findIndex((cat) => cat.id === categoryId);
    if (categoryIndex === -1) return;

    const updatedCategories = [...categories];
    updatedCategories[categoryIndex] = {
      ...updatedCategories[categoryIndex],
      outputs: [
        ...updatedCategories[categoryIndex].outputs,
        {
          id: `temp-${Date.now()}`,
          name: newOutputs[categoryId].trim(),
          description: newOutputDescriptions[categoryId]?.trim(),
          categoryId,
          type: newOutputTypes[categoryId] || "output",
          indicators: newOutputIndicators[categoryId] || [],
        },
      ],
    };

    setCategories(updatedCategories);
    setNewOutputs((prev) => ({ ...prev, [categoryId]: "" }));
    setNewOutputDescriptions((prev) => ({ ...prev, [categoryId]: "" }));
    setNewOutputTypes((prev) => ({ ...prev, [categoryId]: "output" }));
    setNewOutputIndicators((prev) => ({ ...prev, [categoryId]: [] }));
    setHasOutputChanges((prev) => ({ ...prev, [categoryId]: true }));
  };

  const handleRemoveOutput = (categoryId: string, outputId: string) => {
    const categoryIndex = categories.findIndex((cat) => cat.id === categoryId);
    if (categoryIndex === -1) return;

    const updatedCategories = [...categories];
    updatedCategories[categoryIndex] = {
      ...updatedCategories[categoryIndex],
      outputs: updatedCategories[categoryIndex].outputs.filter(
        (output) => output.id !== outputId
      ),
    };

    setCategories(updatedCategories);
    setHasOutputChanges((prev) => ({ ...prev, [categoryId]: true }));
  };

  const handleIndicatorChange = (
    categoryId: string,
    outputId: string,
    indicatorId: string
  ) => {
    const categoryIndex = categories.findIndex((cat) => cat.id === categoryId);
    if (categoryIndex === -1) return;

    const outputIndex = categories[categoryIndex].outputs.findIndex(
      (output) => output.id === outputId
    );
    if (outputIndex === -1) return;

    const updatedCategories = [...categories];
    const output = updatedCategories[categoryIndex].outputs[outputIndex];
    const currentIndicators = output.indicators || [];

    if (currentIndicators.includes(indicatorId)) {
      output.indicators = currentIndicators.filter((id) => id !== indicatorId);
    } else {
      output.indicators = [...currentIndicators, indicatorId];
    }

    setCategories(updatedCategories);
    setHasOutputChanges((prev) => ({ ...prev, [categoryId]: true }));
  };

  const handleNewIndicatorChange = (
    categoryId: string,
    indicatorId: string
  ) => {
    setNewOutputIndicators((prev) => {
      const currentIndicators = prev[categoryId] || [];
      if (currentIndicators.includes(indicatorId)) {
        return {
          ...prev,
          [categoryId]: currentIndicators.filter((id) => id !== indicatorId),
        };
      } else {
        return {
          ...prev,
          [categoryId]: [...currentIndicators, indicatorId],
        };
      }
    });
  };

  const saveOutputs = async (category: Category) => {
    setIsSavingOutputs({ ...isSavingOutputs, [category.id]: true });
    try {
      const [, error] = await fetchData(
        INDEXER.CATEGORIES.OUTPUTS.UPDATE(category.id),
        "PUT",
        {
          idOrSlug: community?.uid,
          categoryId: category.id,
          outputs: category.outputs?.map((output) => ({
            name: output.name,
            type: output.type,
            indicators: output.indicators,
          })) as {
            name: string;
            type: string;
            indicators?: string[];
          }[],
        }
      );
      if (error) throw new Error("Error saving outputs");
      toast.success(MESSAGES.CATEGORIES.OUTPUTS.SUCCESS(category.name));
      setHasOutputChanges((prev) => ({ ...prev, [category.id]: false }));
    } catch (error: any) {
      toast.error(MESSAGES.CATEGORIES.OUTPUTS.ERROR.GENERIC(category.name));
      errorManager(
        `Error saving outputs of community ${community?.uid}`,
        error,
        {
          community: community?.uid,
          idOrSlug: community?.uid,
          outputs: category.outputs?.map((output) => output?.name),
        }
      );
    } finally {
      setIsSavingOutputs({ ...isSavingOutputs, [category.id]: false });
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-800 rounded-lg p-8 border border-gray-100 dark:border-zinc-700 w-full">
      <h2 className="text-2xl font-bold mb-6">
        Manage Categories & Impact Segments
      </h2>
      {categories.length ? (
        <div className="space-y-8">
          {categories.map((category, index) => (
            <div
              key={category.id}
              className="flex w-full flex-col items-start justify-start gap-4"
              style={{
                borderBottomWidth: index === categories.length - 1 ? 0 : 1,
                borderBottomColor: "#E4E7EB",
              }}
            >
              <div className="flex w-full flex-1 flex-col items-start justify-start">
                <h3 className="text-xl font-bold">{category.name}</h3>
              </div>

              <div className="w-full pb-6 mb-6">
                <h5 className="text-md font-semibold mb-4">Modify outputs</h5>
                <Accordion.Root type="multiple" className="space-y-2 w-full">
                  {category.outputs.map((output) => (
                    <Accordion.Item
                      key={output.id}
                      value={output.id}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
                    >
                      <Accordion.Trigger className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {output.name}
                          </span>
                          <span
                            className={cn(
                              "text-xs px-2 py-1 rounded-full",
                              output.type === "output"
                                ? "bg-blue-100 dark:bg-blue-700 text-blue-800 dark:text-blue-300"
                                : "bg-green-100 dark:bg-green-700 text-green-800 dark:text-green-300"
                            )}
                          >
                            {output.type.charAt(0).toUpperCase() +
                              output.type.slice(1)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <ChevronDownIcon className="h-5 w-5 transform transition-transform duration-200 ease-in-out ui-open:rotate-180" />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveOutput(category.id, output.id);
                            }}
                            className="text-red-500 hover:text-red-700 transition-colors"
                            aria-label="Remove output"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </Accordion.Trigger>
                      <Accordion.Content className="p-4 bg-gray-50 dark:bg-zinc-900">
                        <div className="space-y-4">
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            <p>{output.description}</p>
                          </div>
                          <div className="space-y-2">
                            <h6 className="text-sm font-medium">
                              Assigned Indicators
                            </h6>
                            <SearchWithValueDropdown
                              onSelectFunction={(value) =>
                                handleIndicatorChange(
                                  category.id,
                                  output.id,
                                  value
                                )
                              }
                              selected={output.indicators || []}
                              list={indicators.map((indicator) => ({
                                value: indicator.id,
                                title: `${indicator.name} (${indicator.unitOfMeasure})`,
                              }))}
                              type="indicator"
                              prefixUnselected="Select"
                              isMultiple={true}
                            />
                          </div>
                        </div>
                      </Accordion.Content>
                    </Accordion.Item>
                  ))}
                </Accordion.Root>

                <Accordion.Root type="multiple" className="mt-6">
                  <Accordion.Item
                    value="create-new"
                    className="border-2 border-blue-100 dark:border-blue-900 bg-blue-50/30 dark:bg-blue-900/10 rounded-lg overflow-hidden shadow-sm"
                  >
                    <Accordion.Trigger className="w-full flex items-center justify-between p-4 text-left hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-colors">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                          Create new Impact Segment
                        </span>
                      </div>
                      <ChevronDownIcon className="h-5 w-5 text-blue-500 transform transition-transform duration-200 ease-in-out ui-open:rotate-180" />
                    </Accordion.Trigger>
                    <Accordion.Content className="p-4 space-y-4 bg-white dark:bg-zinc-900 border-t border-blue-100 dark:border-blue-900">
                      <div className="flex flex-col gap-4">
                        <div className="flex flex-col gap-2">
                          <label className="text-sm text-gray-600 dark:text-gray-400">
                            Name
                          </label>
                          <input
                            type="text"
                            value={newOutputs[category.id] || ""}
                            onChange={(e) =>
                              setNewOutputs((prev) => ({
                                ...prev,
                                [category.id]: e.target.value,
                              }))
                            }
                            placeholder="Enter name"
                            className="text-sm p-2 border border-gray-200 dark:border-gray-700 rounded-md 
                              focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white w-full"
                          />
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className="text-sm text-gray-600 dark:text-gray-400">
                            Description
                          </label>
                          <textarea
                            value={newOutputDescriptions[category.id] || ""}
                            onChange={(e) =>
                              setNewOutputDescriptions((prev) => ({
                                ...prev,
                                [category.id]: e.target.value,
                              }))
                            }
                            placeholder="Enter description"
                            rows={3}
                            className="text-sm p-2 border border-gray-200 dark:border-gray-700 rounded-md 
                              focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white w-full"
                          />
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className="text-sm text-gray-600 dark:text-gray-400">
                            Type
                          </label>
                          <select
                            value={newOutputTypes[category.id] || "output"}
                            onChange={(e) =>
                              setNewOutputTypes((prev) => ({
                                ...prev,
                                [category.id]: e.target.value as OutputType,
                              }))
                            }
                            className="text-sm p-2 border border-gray-200 dark:border-gray-700 rounded-md 
                              focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white w-full"
                          >
                            {OUTPUT_TYPES.map((type) => (
                              <option key={type} value={type}>
                                {type.charAt(0).toUpperCase() + type.slice(1)}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className="text-sm text-gray-600 dark:text-gray-400">
                            Assign Indicators
                          </label>
                          <SearchWithValueDropdown
                            onSelectFunction={(value) =>
                              handleNewIndicatorChange(category.id, value)
                            }
                            selected={newOutputIndicators[category.id] || []}
                            list={indicators.map((indicator) => ({
                              value: indicator.id,
                              title: `${indicator.name} (${indicator.unitOfMeasure})`,
                            }))}
                            type="indicator"
                            prefixUnselected="Select"
                            isMultiple={true}
                          />
                        </div>
                        <Button
                          onClick={() => handleAddOutput(category.id)}
                          disabled={!newOutputs[category.id]?.trim()}
                          className="w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 
                            transition-colors disabled:opacity-50 mt-2"
                        >
                          Add {newOutputTypes[category.id] || "output"}
                        </Button>
                      </div>
                    </Accordion.Content>
                  </Accordion.Item>
                </Accordion.Root>

                {hasOutputChanges[category.id] && (
                  <Button
                    isLoading={isSavingOutputs[category.id]}
                    disabled={isSavingOutputs[category.id]}
                    onClick={() => saveOutputs(category)}
                    className="mt-4 text-center mx-auto bg-primary-500 px-4 py-2 rounded-md text-white hover:bg-primary-600 
                      dark:bg-primary-900 transition-colors"
                  >
                    Save changes
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex w-full flex-1 flex-col items-center justify-center gap-3">
          <p>{MESSAGES.CATEGORIES.OUTPUTS.EMPTY}</p>
          <div className="flex flex-row gap-10 items-center">
            <Link
              href={PAGES.ADMIN.MANAGE_INDICATORS(
                community?.details?.data?.slug || (community?.uid as string)
              )}
            >
              <Button className="px-10 py-8 bg-brand-blue hover:bg-brand-blue rounded-md transition-all ease-in-out duration-200">
                Edit categories
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};
