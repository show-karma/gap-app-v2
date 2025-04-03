import { Button } from "@/components/Utilities/Button";
import { errorManager } from "@/components/Utilities/errorManager";
import {
  Category,
  ImpactIndicator,
  ImpactSegment,
} from "@/types/impactMeasurement";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { Dialog, Transition } from "@headlessui/react";
import { Fragment, useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { XMarkIcon } from "@heroicons/react/24/outline";
import Image from "next/image";
import { IndicatorsDropdown } from "./IndicatorsDropdown";

const OUTPUT_TYPES = ["output", "outcome"] as const;
type OutputType = (typeof OUTPUT_TYPES)[number];

const OUTPUT_TYPE_DISPLAY = {
  output: "Activity",
  outcome: "Outcome",
} as const;

// Schema definition for the form data
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

interface ActivityOutcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: Category;
  impact_indicators: ImpactIndicator[];
  onSuccess: () => void;
  initialType?: OutputType;
  communityId?: string;
  editingSegment?: ImpactSegment | null;
}

export const ActivityOutcomeModal = ({
  isOpen,
  onClose,
  category,
  impact_indicators,
  onSuccess,
  initialType = "output",
  communityId,
  editingSegment = null,
}: ActivityOutcomeModalProps) => {
  const [isSaving, setIsSaving] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    reset,
    setValue,
    watch,
  } = useForm<ImpactSegmentFormData>({
    resolver: zodResolver(impactSegmentSchema),
    defaultValues: {
      type: editingSegment ? editingSegment.type : initialType,
      name: editingSegment ? editingSegment.name : "",
      description: editingSegment ? editingSegment.description : "",
      impact_indicators:
        editingSegment?.impact_indicators?.map((ind) => ind.id) || [],
    },
    mode: "onChange",
  });

  useEffect(() => {
    if (isOpen) {
      reset({
        type: editingSegment ? editingSegment.type : initialType,
        name: editingSegment ? editingSegment.name : "",
        description: editingSegment ? editingSegment.description : "",
        impact_indicators:
          editingSegment?.impact_indicators?.map((ind) => ind.id) || [],
      });
    }
  }, [editingSegment, isOpen, initialType, reset]);

  const selectedIndicators = watch("impact_indicators") || [];
  const selectedType = watch("type");

  const handleClose = () => {
    reset();
    onClose();
  };

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

  const handleAddOutput = async (data: ImpactSegmentFormData) => {
    try {
      setIsSaving(true);
      const [, error] = await fetchData(
        INDEXER.CATEGORIES.IMPACT_SEGMENTS.CREATE_OR_UPDATE(category.id),
        "POST",
        {
          id: editingSegment?.id,
          name: data.name,
          type: data.type,
          description: data.description,
          impactIndicators: data.impact_indicators,
        }
      );

      if (error) throw error;

      const action = editingSegment ? "updated" : "created";
      toast.success(`${OUTPUT_TYPE_DISPLAY[data.type]} ${action} successfully`);
      reset();
      onSuccess();
      handleClose();
    } catch (error) {
      const action = editingSegment ? "update" : "create";
      toast.error(
        `Failed to ${action} ${OUTPUT_TYPE_DISPLAY[data.type].toLowerCase()}`
      );
      errorManager(`Failed to ${action} impact segment`, error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
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
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-lg bg-white dark:bg-zinc-800 p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex justify-between items-center mb-4">
                  <Dialog.Title
                    as="h3"
                    className="text-black text-3xl max-md:text-xl font-bold dark:text-white text-center w-full"
                  >
                    {editingSegment ? "Edit" : "Add a new"} Activity or Outcome
                  </Dialog.Title>
                  <button
                    onClick={handleClose}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>

                <form
                  onSubmit={handleSubmit(handleAddOutput)}
                  className="space-y-4"
                >
                  <div className="flex flex-col gap-2">
                    <label className="text-sm text-gray-600 dark:text-gray-400">
                      Name
                    </label>
                    <input
                      {...register("name")}
                      placeholder={`Enter activity or outcome name`}
                      className="text-sm p-2 border border-gray-200 dark:border-gray-700 rounded-md 
                        focus:ring-2 focus:ring-blue-500 dark:bg-zinc-700 dark:text-white w-full"
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
                        focus:ring-2 focus:ring-blue-500 dark:bg-zinc-700 dark:text-white w-full"
                    />
                    {errors.description && (
                      <p className="text-sm text-red-500">
                        {errors.description.message}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 mb-2">
                    <label className="text-sm text-gray-600 dark:text-gray-400">
                      Type
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      {OUTPUT_TYPES.map((type) => {
                        const isSelected = watch("type") === type;
                        return (
                          <label
                            key={type}
                            className={`relative flex flex-row items-center justify-center cursor-pointer rounded-lg p-3 transition-all ${
                              isSelected
                                ? type === "output"
                                  ? "bg-[#E0EAFF] dark:bg-blue-900 shadow-md"
                                  : "bg-[#DAF8D9] dark:bg-green-900 shadow-md"
                                : "bg-gray-50 dark:bg-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-700 hover:shadow-sm"
                            }`}
                          >
                            <input
                              type="radio"
                              value={type}
                              {...register("type")}
                              className="sr-only" // Hide the actual radio but keep functionality
                            />
                            <div
                              className={`w-4 h-4 rounded-full border ${
                                isSelected
                                  ? type === "output"
                                    ? "border-blue-500 bg-blue-500"
                                    : "border-green-500 bg-green-500"
                                  : "border-gray-300 dark:border-gray-600"
                              } flex items-center justify-center`}
                            >
                              {isSelected && (
                                <div className="w-2 h-2 rounded-full bg-white" />
                              )}
                            </div>
                            <div className="flex flex-row gap-4 items-center justify-center flex-1">
                              <div
                                className={`flex-shrink-0 ${
                                  isSelected
                                    ? type === "output"
                                      ? "text-blue-500"
                                      : "text-green-500"
                                    : "text-gray-400"
                                }`}
                              >
                                {type === "output" ? (
                                  <Image
                                    src="/icons/activity.svg"
                                    alt="Activity"
                                    width={24}
                                    height={24}
                                    className="mx-auto"
                                  />
                                ) : (
                                  <Image
                                    src="/icons/outcome.svg"
                                    alt="Outcome"
                                    width={24}
                                    height={24}
                                    className="mx-auto"
                                  />
                                )}
                              </div>
                              <div className="font-medium text-center">
                                {OUTPUT_TYPE_DISPLAY[type]}
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-sm text-gray-600 dark:text-gray-400">
                      Assign Indicators
                    </label>
                    <IndicatorsDropdown
                      selectedIndicators={selectedIndicators}
                      indicators={impact_indicators}
                      onIndicatorChange={handleIndicatorChange}
                      communityId={communityId}
                      onIndicatorCreated={(newIndicator) => {
                        toast.success("Indicator created successfully");
                      }}
                    />
                  </div>

                  <div className="flex justify-end gap-2 mt-6">
                    <Button
                      type="button"
                      onClick={handleClose}
                      variant="secondary"
                      className="px-4 py-2"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      isLoading={isSaving}
                      disabled={isSaving || !isValid}
                      className="px-4 py-2"
                      variant="primary"
                    >
                      {editingSegment ? "Update" : "Create"}
                    </Button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};
