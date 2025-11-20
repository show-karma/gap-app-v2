"use client";
import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/Utilities/Button";
import { DatePicker } from "@/components/Utilities/DatePicker";
import { formatDate } from "@/utilities/formatDate";
import toast from "react-hot-toast";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { errorManager } from "@/components/Utilities/errorManager";
import { MESSAGES } from "@/utilities/messages";
import { useAccount } from "wagmi";
import { useAuth } from "@/hooks/useAuth";
import { XMarkIcon } from "@heroicons/react/24/solid";
import { useCommunityDetails } from "@/hooks/useCommunityDetails";
import { Spinner } from "@/components/Utilities/Spinner";
import { cn } from "@/utilities/tailwind";

const createProgramSchema = z.object({
  name: z
    .string()
    .min(3, { message: "Program name must be at least 3 characters" })
    .max(50, { message: "Program name must be at most 50 characters" }),
  description: z
    .string()
    .min(3, { message: "Description is required" }),
  shortDescription: z
    .string()
    .max(100, { message: "Short description must be at most 100 characters" })
    .min(1, { message: "Short description is required" }),
  dates: z
    .object({
      endsAt: z.date().optional(),
      startsAt: z.date().optional(),
    })
    .refine(
      (data) => {
        if (!data.endsAt || !data.startsAt) return true;
        const endsAt = data.endsAt.getTime() / 1000;
        const startsAt = data.startsAt.getTime() / 1000;
        return startsAt ? startsAt <= endsAt : true;
      },
      {
        message: "Start date must be before the end date",
        path: ["startsAt"],
      }
    ),
  budget: z.coerce.number().min(0, { message: "Budget must be a positive number" }).optional(),
});

type CreateProgramType = z.infer<typeof createProgramSchema>;

interface CreateProgramModalProps {
  isOpen: boolean;
  onClose: () => void;
  communityId: string;
  onSuccess: () => void;
}

export function CreateProgramModal({
  isOpen,
  onClose,
  communityId,
  onSuccess,
}: CreateProgramModalProps) {
  const { address, isConnected } = useAccount();
  const { authenticated: isAuth, login } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { data: community, isLoading: isLoadingCommunity, error: communityError } = useCommunityDetails(communityId);

  // Handle ESC key to close modal
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSubmitting) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, isSubmitting, onClose]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors },
    reset,
  } = useForm<CreateProgramType>({
    resolver: zodResolver(createProgramSchema),
    defaultValues: {
      name: "",
      description: "",
      shortDescription: "",
      dates: {
        startsAt: undefined,
        endsAt: undefined,
      },
      budget: undefined,
    },
  });

  const onSubmit = async (data: CreateProgramType) => {
    if (!isConnected || !isAuth) {
      login?.();
      return;
    }

    if (!community) {
      toast.error("Failed to load community data");
      return;
    }

    setIsSubmitting(true);
    try {
      // Create the program metadata
      const metadata = {
        title: data.name,
        description: data.description,
        shortDescription: data.shortDescription,
        programBudget: data.budget,
        startsAt: data.dates.startsAt,
        endsAt: data.dates.endsAt,
        website: "",
        projectTwitter: "",
        socialLinks: {
          twitter: "",
          website: "",
          discord: "",
          orgWebsite: "",
          blog: "",
          forum: "",
          grantsSite: "",
          telegram: "",
        },
        bugBounty: "",
        categories: [],
        ecosystems: [],
        organizations: [],
        networks: [],
        grantTypes: [],
        platformsUsed: [],
        logoImg: "",
        bannerImg: "",
        logoImgData: {},
        bannerImgData: {},
        credentials: {},
        status: "Active",
        type: "program",
        tags: ["karma-gap", "grant-program-registry"],
        communityRef: [community.uid], // Use community UID (hex address), not slug
      };

      // Use community's chain ID
      const chainSelected = community.chainID;

      // Create the program
      const [createResponse, createError] = await fetchData(
        INDEXER.REGISTRY.CREATE,
        "POST",
        {
          owner: address,
          chainId: chainSelected,
          metadata,
        },
        {},
        {},
        true
      );

      if (createError) {
        throw new Error(createError);
      }

      // Extract program ID from response - handle different response structures
      // Expected response formats:
      // 1. { _id: { $oid: "..." } }
      // 2. { program: { _id: { $oid: "..." } } }
      // 3. { id: "..." }
      // 4. "..." (string ID)
      console.log("Program creation response:", createResponse); // For debugging - can be removed in production
      
      let programId: string | undefined;
      if (createResponse?._id?.$oid) {
        programId = createResponse._id.$oid;
      } else if (createResponse?.program?._id?.$oid) {
        programId = createResponse.program._id.$oid;
      } else if (createResponse?.id) {
        programId = createResponse.id;
      } else if (typeof createResponse === "string") {
        // If response is just the ID string
        programId = createResponse;
      }

      if (!programId) {
        // If we can't get the ID immediately, try to query for it
        // For now, show success but warn about manual approval
        console.warn("Could not extract program ID from response:", createResponse);
        toast.success(
          "Program created successfully. Please approve it manually from the manage programs page.",
          { duration: 10000 }
        );
        reset();
        onSuccess();
        onClose();
        return;
      }

      // Auto-approve the program
      try {
        const [approveResponse, approveError] = await fetchData(
          INDEXER.REGISTRY.APPROVE,
          "POST",
          {
            id: programId,
            isValid: "accepted",
          },
          {},
          {},
          true
        );

        if (approveError) {
          console.error("Failed to auto-approve program:", approveError);
          toast.success(
            "Program created successfully, but auto-approval failed. Please approve it manually from the manage programs page.",
            { duration: 10000 }
          );
        } else {
          toast.success("Program created and approved successfully!");
        }
      } catch (approveError: any) {
        console.error("Error during auto-approval:", approveError);
        toast.success(
          "Program created successfully, but auto-approval failed. Please approve it manually from the manage programs page.",
          { duration: 10000 }
        );
      }

      reset();
      onSuccess();
      onClose();
    } catch (error: any) {
      const errorMessage = error.message;
      if (errorMessage?.includes("already exists")) {
        toast.error("A program with this name already exists");
      } else {
        errorManager(
          MESSAGES.PROGRAM_REGISTRY.CREATE.ERROR(data.name),
          error,
          {
            address,
            data,
          }
        );
        toast.error("Failed to create program. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const labelStyle = "text-sm font-bold text-brand-gray dark:text-zinc-100";
  const inputStyle =
    "mt-1 w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-300 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100";

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={(e) => {
        // Close modal when clicking backdrop (outside the modal content)
        if (e.target === e.currentTarget && !isSubmitting) {
          onClose();
        }
      }}
    >
      <div 
        className="bg-white dark:bg-zinc-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => {
          // Prevent closing when clicking inside the modal
          e.stopPropagation();
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Create New Program
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            disabled={isSubmitting}
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {isLoadingCommunity ? (
          <div className="flex items-center justify-center py-8">
            <Spinner />
          </div>
        ) : communityError ? (
          <div className="flex flex-col items-center justify-center py-8">
            <p className="text-red-500 dark:text-red-400 mb-4">
              Failed to load community data. Please try again.
            </p>
            <Button
              variant="secondary"
              onClick={onClose}
            >
              Close
            </Button>
          </div>
        ) : !community ? (
          <div className="flex flex-col items-center justify-center py-8">
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Community not found.
            </p>
            <Button
              variant="secondary"
              onClick={onClose}
            >
              Close
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Program Name */}
            <div className="flex w-full flex-col gap-1">
              <label htmlFor="program-name" className={labelStyle}>
                Program Name <span className="text-red-500">*</span>
              </label>
              <input
                id="program-name"
                className={inputStyle}
                placeholder="Ex: Super cool Program"
                {...register("name")}
                disabled={isSubmitting}
              />
              <p className="text-sm text-red-400">{errors.name?.message}</p>
            </div>

            {/* Program Description */}
            <div className="flex w-full flex-col gap-1">
              <label htmlFor="program-description" className={labelStyle}>
                Program Description <span className="text-red-500">*</span>
              </label>
              <textarea
                id="program-description"
                className={cn(
                  inputStyle,
                  "min-h-[120px] max-h-[240px] resize-y"
                )}
                placeholder="Please provide a description of this program"
                {...register("description")}
                disabled={isSubmitting}
              />
              <p className="text-sm text-red-400">
                {errors.description?.message}
              </p>
            </div>

            {/* Short Description */}
            <div className="flex w-full flex-col gap-1">
              <label htmlFor="short-description" className={labelStyle}>
                Program Short Description <span className="text-red-500">*</span>
                <span className="text-xs text-gray-500 ml-2 font-normal">
                  (100 characters max)
                </span>
              </label>
              <input
                id="short-description"
                className={inputStyle}
                placeholder="Brief description (max 100 characters)"
                maxLength={100}
                {...register("shortDescription")}
                disabled={isSubmitting}
              />
              <div className="flex justify-between items-center">
                <p className="text-sm text-red-400">
                  {errors.shortDescription?.message}
                </p>
                <p className="text-xs text-gray-500">
                  {watch("shortDescription")?.length || 0}/100
                </p>
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <Controller
                name="dates.startsAt"
                control={control}
                render={({ field, formState }) => (
                  <div className="flex w-full flex-col gap-2">
                    <label className={labelStyle}>Start Date (optional)</label>
                    <DatePicker
                      selected={field.value}
                      onSelect={(date) => {
                        const currentValue = watch("dates.startsAt");
                        if (currentValue && formatDate(date) === formatDate(currentValue)) {
                          setValue("dates.startsAt", undefined, {
                            shouldValidate: true,
                          });
                          field.onChange(undefined);
                        } else {
                          setValue("dates.startsAt", date, {
                            shouldValidate: true,
                          });
                          field.onChange(date);
                        }
                      }}
                      placeholder="Pick a date"
                      buttonClassName="w-full text-base bg-white dark:bg-zinc-800"
                      clearButtonFn={() => {
                        setValue("dates.startsAt", undefined, {
                          shouldValidate: true,
                        });
                        field.onChange(undefined);
                      }}
                    />
                    <p className="text-sm text-red-400">
                      {formState.errors.dates?.startsAt?.message}
                    </p>
                  </div>
                )}
              />

              <Controller
                name="dates.endsAt"
                control={control}
                render={({ field, formState }) => (
                  <div className="flex w-full flex-col gap-2">
                    <label className={labelStyle}>End Date (optional)</label>
                    <DatePicker
                      selected={field.value}
                      onSelect={(date) => {
                        const currentValue = watch("dates.endsAt");
                        if (currentValue && formatDate(date) === formatDate(currentValue)) {
                          setValue("dates.endsAt", undefined, {
                            shouldValidate: true,
                          });
                          field.onChange(undefined);
                        } else {
                          setValue("dates.endsAt", date, {
                            shouldValidate: true,
                          });
                          field.onChange(date);
                        }
                      }}
                      minDate={watch("dates.startsAt")}
                      placeholder="Pick a date"
                      buttonClassName="w-full text-base bg-white dark:bg-zinc-800"
                      clearButtonFn={() => {
                        setValue("dates.endsAt", undefined, {
                          shouldValidate: true,
                        });
                        field.onChange(undefined);
                      }}
                    />
                    <p className="text-sm text-red-400">
                      {formState.errors.dates?.endsAt?.message}
                    </p>
                  </div>
                )}
              />
            </div>

            {/* Budget */}
            <div className="flex w-full flex-col gap-1">
              <label htmlFor="program-budget" className={labelStyle}>
                Program Budget (optional)
              </label>
              <input
                id="program-budget"
                type="number"
                min="0"
                step="1"
                className={inputStyle}
                placeholder="Ex: 100000"
                {...register("budget")}
                disabled={isSubmitting}
              />
              <p className="text-sm text-red-400">{errors.budget?.message}</p>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-zinc-700">
              <Button
                variant="secondary"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Creating..." : "Create Program"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

