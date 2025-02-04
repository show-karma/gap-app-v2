import { SearchWithValueDropdown } from "@/components/Pages/Communities/Impact/SearchWithValueDropdown";
import { Button } from "@/components/Utilities/Button";
import { errorManager } from "@/components/Utilities/errorManager";
import { useIndicators } from "@/hooks/useIndicators";
import {
  Category,
  ImpactIndicator,
  ImpactSegment,
} from "@/types/impactMeasurement";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { MESSAGES } from "@/utilities/messages";
import { PAGES } from "@/utilities/pages";
import { cn } from "@/utilities/tailwind";
import { ChevronDownIcon, TrashIcon } from "@heroicons/react/24/outline";
import { zodResolver } from "@hookform/resolvers/zod";
import * as Accordion from "@radix-ui/react-accordion";
import { ICommunityResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { z } from "zod";

const OUTPUT_TYPES = ["output", "outcome"] as const;
type OutputType = (typeof OUTPUT_TYPES)[number];

const OUTPUT_TYPE_DISPLAY = {
  output: "Activity",
  outcome: "Outcome"
} as const;

const impactSegmentSchema = z.object({
  name: z
    .string()
    .min(3, "Name must be at least 3 characters")
    .max(100, "Name must be less than 100 characters"),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters")
    .max(500, "Description must be less than 500 characters"),
  type: z.enum(OUTPUT_TYPES),
  impact_indicators: z.array(z.string()).optional(),
});

type ImpactSegmentFormData = z.infer<typeof impactSegmentSchema>;

interface Output {
  id: string;
  name: string;
  categoryId: string;
  type: OutputType;
  description?: string;
  impact_indicators?: string[]; // Array of indicator IDs
}

interface ManageCategoriesOutputsProps {
  categories: Category[];
  setCategories: (categories: Category[]) => void;
  community: ICommunityResponse | undefined;
  refreshCategories: (isSilent?: boolean) => Promise<any>;
}

interface EditFormProps {
  segment: ImpactSegment;
  categoryId: string;
  onSave: (data: ImpactSegmentFormData) => void;
  isLoading: boolean;
  impact_indicators: ImpactIndicator[];
}

const EditForm = ({
  segment,
  categoryId,
  onSave,
  isLoading,
  impact_indicators,
}: EditFormProps) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isValid, isDirty },
    setValue,
    watch,
  } = useForm<ImpactSegmentFormData>({
    resolver: zodResolver(impactSegmentSchema),
    defaultValues: {
      name: segment.name,
      description: segment.description || "",
      type: segment.type,
      impact_indicators:
        segment.impact_indicators?.map((item) => item.id) || [],
    },
    mode: "onChange",
  });

  const selectedIndicators = watch("impact_indicators") || [];

  const handleIndicatorChange = (value: string) => {
    const current = selectedIndicators;
    const updated = current.includes(value)
      ? current.filter((id) => id !== value)
      : [...current, value];
    setValue("impact_indicators", updated, {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  return (
    <form onSubmit={handleSubmit(onSave)} className="space-y-4">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-sm text-gray-600 dark:text-gray-400">
            Name
          </label>
          <input
            {...register("name")}
            placeholder="Enter name"
            className="text-sm p-2 border border-gray-200 dark:border-gray-700 rounded-md 
              focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white w-full"
          />
          {errors.name && (
            <p className="text-sm text-red-500">{errors.name.message}</p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm text-gray-600 dark:text-gray-400">
            Description
          </label>
          <textarea
            {...register("description")}
            placeholder="Enter description"
            rows={3}
            className="text-sm p-2 border border-gray-200 dark:border-gray-700 rounded-md 
              focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white w-full"
          />
          {errors.description && (
            <p className="text-sm text-red-500">{errors.description.message}</p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm text-gray-600 dark:text-gray-400">
            Type
          </label>
          <select
            {...register("type")}
            className="text-sm p-2 border border-gray-200 dark:border-gray-700 rounded-md 
              focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white w-full"
          >
            {OUTPUT_TYPES.map((type) => (
              <option key={type} value={type}>
                {OUTPUT_TYPE_DISPLAY[type]}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="space-y-2">
        <h6 className="text-sm font-medium">Assigned Indicators</h6>
        <SearchWithValueDropdown
          onSelectFunction={handleIndicatorChange}
          selected={selectedIndicators}
          list={impact_indicators.map((indicator) => ({
            value: indicator.id,
            title: `${indicator.name} (${indicator.unitOfMeasure})`,
          }))}
          type="indicator"
          prefixUnselected="Select"
          isMultiple={true}
        />
      </div>
      <div className="flex justify-end">
        <Button
          type="submit"
          isLoading={isLoading}
          disabled={isLoading || !isValid || !isDirty}
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 
            transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Save Changes
        </Button>
      </div>
    </form>
  );
};

export const ManageCategoriesOutputs = ({
  categories,
  setCategories,
  community,
  refreshCategories,
}: ManageCategoriesOutputsProps) => {
  const [isSavingOutput, setIsSavingOutput] = useState<string>("");
  const [isDeletingOutput, setIsDeletingOutput] = useState<string>("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const selectedCategory = categories.find((cat) => cat.id === selectedCategoryId);

  const { data: impact_indicators = [] } = useIndicators({
    communityId: community?.uid || "",
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<ImpactSegmentFormData>({
    resolver: zodResolver(impactSegmentSchema),
    defaultValues: {
      type: "output",
      impact_indicators: [],
    },
  });

  const selectedIndicators = watch("impact_indicators") || [];

  const handleAddOutput = async (
    data: ImpactSegmentFormData,
    categoryId: string
  ) => {
    try {
      setIsSavingOutput("new");
      const [, error] = await fetchData(
        INDEXER.CATEGORIES.IMPACT_SEGMENTS.CREATE_OR_UPDATE(categoryId),
        "POST",
        {
          name: data.name,
          type: data.type,
          description: data.description,
          impactIndicators: data.impact_indicators,
        }
      );
      if (error) throw error;

      refreshCategories(true).then((refreshedCategories) => {
        setCategories(refreshedCategories);
      });
      reset();
      toast.success("Impact segment created successfully");
    } catch (error) {
      toast.error("Failed to create impact segment");
      errorManager("Failed to create impact segment", error);
    } finally {
      setIsSavingOutput("");
    }
  };

  const handleRemoveOutput = async (categoryId: string, segmentId: string) => {
    try {
      setIsDeletingOutput(segmentId);
      const [, error] = await fetchData(
        INDEXER.CATEGORIES.IMPACT_SEGMENTS.DELETE(categoryId),
        "DELETE",
        {
          segmentId,
        }
      );
      if (error) throw error;

      refreshCategories(true).then((refreshedCategories) => {
        setCategories(refreshedCategories);
      });
      toast.success("Impact segment deleted successfully");
    } catch (error) {
      toast.error("Failed to delete impact segment");
      errorManager("Failed to delete impact segment", error);
    } finally {
      setIsDeletingOutput("");
    }
  };

  const handleNewIndicatorChange = (value: string) => {
    const current = selectedIndicators;
    const updated = current.includes(value)
      ? current.filter((id) => id !== value)
      : [...current, value];
    setValue("impact_indicators", updated);
  };

  const saveOutput = async (
    data: ImpactSegmentFormData,
    categoryId: string,
    outputId: string
  ) => {
    try {
      setIsSavingOutput(outputId);
      const [, error] = await fetchData(
        INDEXER.CATEGORIES.IMPACT_SEGMENTS.CREATE_OR_UPDATE(categoryId),
        "POST",
        {
          name: data.name,
          type: data.type,
          description: data.description,
          impactIndicators: data.impact_indicators,
        }
      );
      if (error) throw error;

      refreshCategories(true).then((refreshedCategories) => {
        setCategories(refreshedCategories);
      });

      toast.success("Impact segment updated successfully");
    } catch (error) {
      toast.error("Failed to update impact segment");
      errorManager("Failed to update impact segment", error);
    } finally {
      setIsSavingOutput("");
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-800 rounded-lg p-8 border border-gray-100 dark:border-zinc-700 w-full">
      <h2 className="text-2xl font-bold mb-6">
        Manage Activities & Outcomes
      </h2>
      {categories.length ? (
        <div className="space-y-8">
          <div className="flex flex-col gap-4">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Choose a category to define it&apos;s activities and outcomes
            </label>
            <select
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              className="w-full p-2 text-sm border border-gray-200 dark:border-gray-700 rounded-md 
                focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
            >
              <option value="">Select a category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          {selectedCategory && (
            <div className="w-full">
              <div className="flex w-full flex-1 flex-col items-start justify-start mb-6">
                <h3 className="text-xl font-bold">{selectedCategory.name}</h3>
              </div>

              <div className="w-full">
                <Accordion.Root type="multiple" className="space-y-2 w-full">
                  {selectedCategory.impact_segments?.map((segment) => (
                    <Accordion.Item
                      key={segment.id}
                      value={segment.id}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
                    >
                      <Accordion.Trigger className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {segment.name}
                          </span>
                          <span
                            className={cn(
                              "text-xs px-2 py-1 rounded-full",
                              segment.type === "output"
                                ? "bg-blue-100 dark:bg-blue-700 text-blue-800 dark:text-blue-300"
                                : "bg-green-100 dark:bg-green-700 text-green-800 dark:text-green-300"
                            )}
                          >
                            {OUTPUT_TYPE_DISPLAY[segment.type]}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <ChevronDownIcon className="h-5 w-5 transform transition-transform duration-200 ease-in-out ui-open:rotate-180" />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveOutput(selectedCategory.id, segment.id);
                            }}
                            className="text-red-500 hover:text-red-700 transition-colors disabled:opacity-50"
                            aria-label="Remove output"
                            disabled={isDeletingOutput === segment.id}
                          >
                            <TrashIcon
                              className={cn(
                                "h-4 w-4",
                                isDeletingOutput === segment.id &&
                                  "animate-pulse opacity-50"
                              )}
                            />
                          </button>
                        </div>
                      </Accordion.Trigger>
                      <Accordion.Content className="p-4 bg-gray-50 dark:bg-zinc-900">
                        <EditForm
                          segment={segment}
                          categoryId={selectedCategory.id}
                          onSave={(data) =>
                            saveOutput(data, selectedCategory.id, segment.id)
                          }
                          isLoading={isSavingOutput === segment.id}
                          impact_indicators={impact_indicators}
                        />
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
                          Create Activity/Outcome
                        </span>
                      </div>
                      <ChevronDownIcon className="h-5 w-5 text-blue-500 transform transition-transform duration-200 ease-in-out ui-open:rotate-180" />
                    </Accordion.Trigger>
                    <Accordion.Content className="p-4 space-y-4 bg-white dark:bg-zinc-900 border-t border-blue-100 dark:border-blue-900">
                      <form
                        onSubmit={handleSubmit((data) =>
                          handleAddOutput(data, selectedCategory.id)
                        )}
                        className="flex flex-col gap-4"
                      >
                        <div className="flex flex-col gap-2">
                          <label className="text-sm text-gray-600 dark:text-gray-400">
                            Name
                          </label>
                          <input
                            {...register("name")}
                            placeholder="Enter Activity/Outcome name"
                            className="text-sm p-2 border border-gray-200 dark:border-gray-700 rounded-md 
                              focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white w-full"
                          />
                          {errors.name && (
                            <p className="text-sm text-red-500">
                              {errors.name.message}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className="text-sm text-gray-600 dark:text-gray-400">
                            Description
                          </label>
                          <textarea
                            {...register("description")}
                            placeholder="Enter description"
                            rows={3}
                            className="text-sm p-2 border border-gray-200 dark:border-gray-700 rounded-md 
                              focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white w-full"
                          />
                          {errors.description && (
                            <p className="text-sm text-red-500">
                              {errors.description.message}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className="text-sm text-gray-600 dark:text-gray-400">
                            Type
                          </label>
                          <select
                            {...register("type")}
                            className="text-sm p-2 border border-gray-200 dark:border-gray-700 rounded-md 
                              focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white w-full"
                          >
                            {OUTPUT_TYPES.map((type) => (
                              <option key={type} value={type}>
                                {OUTPUT_TYPE_DISPLAY[type]}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className="text-sm text-gray-600 dark:text-gray-400">
                            Assign Indicators
                          </label>
                          <SearchWithValueDropdown
                            onSelectFunction={handleNewIndicatorChange}
                            selected={selectedIndicators}
                            list={impact_indicators.map((indicator) => ({
                              value: indicator.id,
                              title: `${indicator.name} (${indicator.unitOfMeasure})`,
                            }))}
                            type="indicator"
                            prefixUnselected="Select"
                            isMultiple={true}
                          />
                        </div>
                        <Button
                          type="submit"
                          isLoading={isSavingOutput === "new"}
                          disabled={isSavingOutput === "new"}
                          className="w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 
                            transition-colors disabled:opacity-50 mt-2"
                        >
                          Add Activity/Outcome
                        </Button>
                      </form>
                    </Accordion.Content>
                  </Accordion.Item>
                </Accordion.Root>
              </div>
            </div>
          )}
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
