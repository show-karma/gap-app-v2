"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import toast from "react-hot-toast";
import { useAccount } from "wagmi";
import type { GrantProgram } from "@/components/Pages/ProgramRegistry/ProgramList";
import { DatePicker } from "@/components/Utilities/DatePicker";
import { errorManager } from "@/components/Utilities/errorManager";
import { MarkdownEditor } from "@/components/Utilities/MarkdownEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/hooks/useAuth";
import { type CreateProgramFormSchema, createProgramSchema } from "@/schemas/programFormSchema";
import { ProgramRegistryService } from "@/services/programRegistry.service";
import fetchData from "@/utilities/fetchData";
import { formatDate } from "@/utilities/formatDate";
import { INDEXER } from "@/utilities/indexer";
import { MESSAGES } from "@/utilities/messages";
import { sanitizeObject } from "@/utilities/sanitize";

interface ProgramDetailsTabProps {
  programId: string;
  chainId: number;
  readOnly?: boolean;
}

// Constants
const SHORT_DESCRIPTION_MAX_LENGTH = 100;
const DATE_PICKER_BUTTON_CLASS = "w-full text-base";

/**
 * Helper component for ARIA live region error announcements
 */
function AriaLiveError({ error }: { error?: { message?: string } }) {
  if (!error?.message) return null;
  return (
    <div aria-live="polite" aria-atomic="true" className="sr-only">
      {`Error: ${error.message}`}
    </div>
  );
}

/**
 * Helper function to build form values from program metadata
 */
function buildFormValuesFromMetadata(metadata: GrantProgram["metadata"]) {
  if (!metadata) return null;

  return {
    name: metadata.title || "",
    description: metadata.description || "",
    shortDescription: metadata.shortDescription || "",
    dates: {
      startsAt: metadata.startsAt ? new Date(metadata.startsAt) : undefined,
      endsAt: metadata.endsAt ? new Date(metadata.endsAt) : undefined,
    },
    budget: metadata.programBudget ? parseFloat(metadata.programBudget.toString()) : undefined,
  };
}

/**
 * Helper function to build metadata object for API update
 */
function buildUpdateMetadata(
  formData: CreateProgramFormSchema,
  existingMetadata: GrantProgram["metadata"]
) {
  const updatedFields = {
    title: formData.name,
    description: formData.description,
    shortDescription: formData.shortDescription,
    programBudget: formData.budget,
    startsAt: formData.dates.startsAt,
    endsAt: formData.dates.endsAt,
  };

  return sanitizeObject({
    ...existingMetadata,
    ...updatedFields,
  });
}

export function ProgramDetailsTab({
  programId,
  chainId,
  readOnly = false,
}: ProgramDetailsTabProps) {
  const { address, isConnected } = useAccount();
  const { authenticated: isAuth, login } = useAuth();

  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingProgram, setIsLoadingProgram] = useState(true);
  const [program, setProgram] = useState<GrantProgram | null>(null);
  const [programError, setProgramError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors, isSubmitting, isDirty },
    reset,
  } = useForm<CreateProgramFormSchema>({
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

  // Optimize watched values to prevent unnecessary re-renders
  const shortDescription = useWatch({ control, name: "shortDescription" });
  const startDate = useWatch({ control, name: "dates.startsAt" });

  // Memoize disabled state calculation
  const isDisabled = useMemo(
    () => isSubmitting || isLoading || readOnly,
    [isSubmitting, isLoading, readOnly]
  );

  // Helper to process and update program data
  const processProgramData = useCallback(
    (data: unknown) => {
      const programData = Array.isArray(data) ? data[0] : data;
      if (!programData) {
        // Handle empty array or undefined data
        setProgram(null);
        return;
      }
      setProgram(programData as GrantProgram);
      const formValues = buildFormValuesFromMetadata((programData as GrantProgram).metadata);
      if (formValues) {
        reset(formValues);
      }
    },
    [reset]
  );

  // Fetch program data
  const fetchProgram = useCallback(async () => {
    try {
      setIsLoadingProgram(true);
      setProgramError(null);
      const [data, error] = await fetchData(INDEXER.REGISTRY.FIND_BY_ID(programId, chainId));
      if (error) {
        throw new Error(error);
      }
      if (data) {
        processProgramData(data);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to load program data";
      setProgramError(errorMessage);
      errorManager("Failed to load program data", error, { programId, chainId });
    } finally {
      setIsLoadingProgram(false);
    }
  }, [programId, chainId, processProgramData]);

  useEffect(() => {
    if (programId && chainId) {
      fetchProgram();
    } else {
      // Don't leave in loading state if programId/chainId is missing
      setIsLoadingProgram(false);
    }
  }, [programId, chainId, fetchProgram]);

  // Validate submission prerequisites
  const validateSubmissionPrerequisites = useCallback((): string | null => {
    if (readOnly) {
      return "You don't have permission to edit this program";
    }
    if (!isConnected || !isAuth) {
      login?.();
      return "Authentication required";
    }
    if (!address) {
      return "Wallet address is required";
    }
    if (!program) {
      return "Program data not loaded";
    }
    return null;
  }, [readOnly, isConnected, isAuth, login, address, program]);

  // Refetch program data after update
  const refetchProgramData = useCallback(async () => {
    try {
      const [updatedData, updateError] = await fetchData(
        INDEXER.REGISTRY.FIND_BY_ID(programId, chainId)
      );

      if (updateError) {
        console.warn("Failed to refetch program data after update:", updateError);
        return;
      }

      if (updatedData) {
        processProgramData(updatedData);
      }
    } catch (error) {
      console.warn("Error refetching program data:", error);
    }
  }, [programId, chainId, processProgramData]);

  // Helper function to create date picker props (memoized to prevent recreation)
  const createDatePickerProps = useCallback(
    (fieldName: "startsAt" | "endsAt", field: { onChange: (value: Date | undefined) => void }) => ({
      onSelect: (date: Date | undefined) => {
        if (isDisabled) return;
        const currentValue = watch(`dates.${fieldName}`);
        if (currentValue && date && formatDate(date) === formatDate(currentValue)) {
          setValue(`dates.${fieldName}`, undefined, { shouldValidate: true });
          field.onChange(undefined);
        } else {
          setValue(`dates.${fieldName}`, date, { shouldValidate: true });
          field.onChange(date);
        }
      },
      clearButtonFn: () => {
        setValue(`dates.${fieldName}`, undefined, { shouldValidate: true });
        field.onChange(undefined);
      },
    }),
    [isDisabled, watch, setValue]
  );

  const onSubmit = async (data: CreateProgramFormSchema) => {
    const validationError = validateSubmissionPrerequisites();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    // V2 uses programId (domain identifier), not MongoDB _id
    const programIdToUpdate = programId || ProgramRegistryService.extractProgramId(program!);
    if (!programIdToUpdate) {
      errorManager("Program missing ID", new Error("Program ID not found"), {
        programId,
        chainId,
        programKeys: Object.keys(program!),
      });
      toast.error("Program ID not found. Cannot update program.");
      return;
    }

    setIsLoading(true);
    try {
      const metadata = buildUpdateMetadata(data, program!.metadata);

      // Use V2 update endpoint
      await ProgramRegistryService.updateProgram(
        programIdToUpdate,
        chainId,
        metadata
      );

      toast.success("Program updated successfully!");
      await refetchProgramData();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("already exists")) {
        toast.error("A program with this name already exists");
      } else {
        errorManager(MESSAGES.PROGRAM_REGISTRY.EDIT.ERROR(data.name), error, {
          address,
          data,
          programId,
          chainId,
        });
        toast.error(`Failed to update program: ${errorMessage}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingProgram) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner />
      </div>
    );
  }

  if (programError) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <p className="text-sm text-destructive mb-4">{programError}</p>
        <Button variant="secondary" onClick={fetchProgram}>
          Retry
        </Button>
      </div>
    );
  }

  if (!program) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <p className="text-sm text-muted-foreground mb-4">Program not found.</p>
      </div>
    );
  }

  return (
    <div className="h-full p-4 sm:p-6 lg:p-8 overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Program Name */}
          <div className="flex w-full flex-col gap-1">
            <Label htmlFor="program-name">
              Program Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="program-name"
              placeholder="Ex: Builder Growth Program"
              {...register("name")}
              disabled={isDisabled}
              aria-invalid={errors.name ? "true" : "false"}
              aria-describedby={errors.name ? "program-name-error" : undefined}
            />
            {errors.name && (
              <p id="program-name-error" className="text-sm text-destructive" role="alert">
                {errors.name.message}
              </p>
            )}
            <AriaLiveError error={errors.name} />
          </div>

          {/* Program Description */}
          <Controller
            name="description"
            control={control}
            render={({ field: { onChange, onBlur, value }, fieldState }) => (
              <div className="flex w-full flex-col gap-1">
                <MarkdownEditor
                  label="Program Description"
                  placeholder="Please provide a description of this program"
                  value={value || ""}
                  onChange={onChange}
                  onBlur={onBlur}
                  error={fieldState.error?.message}
                  isRequired
                  isDisabled={isDisabled}
                  id="program-description"
                  height={200}
                  minHeight={150}
                />
                <AriaLiveError error={fieldState.error} />
              </div>
            )}
          />

          {/* Short Description */}
          <Controller
            name="shortDescription"
            control={control}
            render={({ field: { onChange, onBlur, value }, fieldState }) => (
              <div className="flex w-full flex-col gap-1">
                <MarkdownEditor
                  label="Program Short Description"
                  description="100 characters max"
                  placeholder="Brief description (max 100 characters)"
                  value={value || ""}
                  onChange={(val) => {
                    if (val.length <= SHORT_DESCRIPTION_MAX_LENGTH) {
                      onChange(val);
                    }
                  }}
                  onBlur={onBlur}
                  error={fieldState.error?.message}
                  isRequired
                  isDisabled={isDisabled}
                  id="short-description"
                  height={120}
                  minHeight={100}
                />
                <p
                  id="short-description-count"
                  className="text-xs text-muted-foreground text-right"
                >
                  {shortDescription?.length || 0}/{SHORT_DESCRIPTION_MAX_LENGTH}
                </p>
                <AriaLiveError error={fieldState.error} />
              </div>
            )}
          />

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <Controller
              name="dates.startsAt"
              control={control}
              render={({ field, formState }) => {
                const datePickerProps = createDatePickerProps("startsAt", field);
                return (
                  <div className="flex w-full flex-col gap-2">
                    <Label htmlFor="start-date">Start Date (optional)</Label>
                    <DatePicker
                      selected={field.value}
                      onSelect={datePickerProps.onSelect}
                      placeholder="Pick a date"
                      buttonClassName={`${DATE_PICKER_BUTTON_CLASS} ${
                        isDisabled ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                      clearButtonFn={datePickerProps.clearButtonFn}
                    />
                    {formState.errors.dates?.startsAt && (
                      <p className="text-sm text-destructive" role="alert">
                        {formState.errors.dates.startsAt.message}
                      </p>
                    )}
                    <AriaLiveError error={formState.errors.dates?.startsAt} />
                  </div>
                );
              }}
            />

            <Controller
              name="dates.endsAt"
              control={control}
              render={({ field, formState }) => {
                const datePickerProps = createDatePickerProps("endsAt", field);
                return (
                  <div className="flex w-full flex-col gap-2">
                    <Label htmlFor="end-date">End Date (optional)</Label>
                    <DatePicker
                      selected={field.value}
                      onSelect={datePickerProps.onSelect}
                      minDate={startDate}
                      placeholder="Pick a date"
                      buttonClassName={`${DATE_PICKER_BUTTON_CLASS} ${
                        isDisabled ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                      clearButtonFn={datePickerProps.clearButtonFn}
                    />
                    {formState.errors.dates?.endsAt && (
                      <p className="text-sm text-destructive" role="alert">
                        {formState.errors.dates.endsAt.message}
                      </p>
                    )}
                    <AriaLiveError error={formState.errors.dates?.endsAt} />
                  </div>
                );
              }}
            />
          </div>

          {/* Budget */}
          <div className="flex w-full flex-col gap-1">
            <Label htmlFor="program-budget">Program Budget (optional)</Label>
            <Input
              id="program-budget"
              type="number"
              min="0"
              step="1"
              placeholder="Ex: 100000"
              {...register("budget")}
              disabled={isDisabled}
              aria-invalid={errors.budget ? "true" : "false"}
              aria-describedby={errors.budget ? "program-budget-error" : undefined}
            />
            {errors.budget && (
              <p id="program-budget-error" className="text-sm text-destructive" role="alert">
                {errors.budget.message}
              </p>
            )}
            <AriaLiveError error={errors.budget} />
          </div>

          {/* Actions */}
          {!readOnly && (
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="submit"
                disabled={!isDirty || isSubmitting || isLoading}
                isLoading={isSubmitting || isLoading}
              >
                Save Changes
              </Button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
