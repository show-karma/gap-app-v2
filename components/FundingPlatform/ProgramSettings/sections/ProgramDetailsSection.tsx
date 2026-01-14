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
import { useProgramConfig } from "@/hooks/useFundingPlatform";
import { type CreateProgramFormSchema, createProgramSchema } from "@/schemas/programFormSchema";
import { ProgramRegistryService } from "@/services/programRegistry.service";
import fetchData from "@/utilities/fetchData";
import { formatDate } from "@/utilities/formatDate";
import { INDEXER } from "@/utilities/indexer";
import { MESSAGES } from "@/utilities/messages";
import { sanitizeObject } from "@/utilities/sanitize";

interface ProgramDetailsSectionProps {
  programId: string;
  chainId?: number;
  readOnly?: boolean;
}

const SHORT_DESCRIPTION_MAX_LENGTH = 100;

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

function buildUpdateMetadata(
  formData: CreateProgramFormSchema,
  existingMetadata: GrantProgram["metadata"]
) {
  return sanitizeObject({
    ...existingMetadata,
    title: formData.name,
    description: formData.description,
    shortDescription: formData.shortDescription,
    programBudget: formData.budget,
    startsAt: formData.dates.startsAt,
    endsAt: formData.dates.endsAt,
  });
}

export function ProgramDetailsSection({
  programId,
  chainId,
  readOnly = false,
}: ProgramDetailsSectionProps) {
  const { data: programConfig } = useProgramConfig(programId);
  const effectiveChainId = chainId ?? programConfig?.chainID;
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
      dates: { startsAt: undefined, endsAt: undefined },
      budget: undefined,
    },
  });

  const shortDescription = useWatch({ control, name: "shortDescription" });
  const startDate = useWatch({ control, name: "dates.startsAt" });
  const isDisabled = useMemo(
    () => isSubmitting || isLoading || readOnly,
    [isSubmitting, isLoading, readOnly]
  );

  const processProgramData = useCallback(
    (data: unknown) => {
      const programData = Array.isArray(data) ? data[0] : data;
      if (!programData) {
        setProgram(null);
        return;
      }
      setProgram(programData as GrantProgram);
      const formValues = buildFormValuesFromMetadata((programData as GrantProgram).metadata);
      if (formValues) reset(formValues);
    },
    [reset]
  );

  const fetchProgram = useCallback(async () => {
    if (!effectiveChainId) {
      setIsLoadingProgram(false);
      return;
    }
    try {
      setIsLoadingProgram(true);
      setProgramError(null);
      const [data, error] = await fetchData(
        INDEXER.REGISTRY.FIND_BY_ID(programId, effectiveChainId)
      );
      if (error) throw new Error(error);
      if (data) processProgramData(data);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to load program data";
      setProgramError(errorMessage);
      errorManager("Failed to load program data", error, { programId, chainId: effectiveChainId });
    } finally {
      setIsLoadingProgram(false);
    }
  }, [programId, effectiveChainId, processProgramData]);

  useEffect(() => {
    if (programId && effectiveChainId) {
      fetchProgram();
    } else {
      setIsLoadingProgram(false);
    }
  }, [programId, effectiveChainId, fetchProgram]);

  const refetchProgramData = useCallback(async () => {
    if (!effectiveChainId) return;
    try {
      const [updatedData, updateError] = await fetchData(
        INDEXER.REGISTRY.FIND_BY_ID(programId, effectiveChainId)
      );
      if (!updateError && updatedData) processProgramData(updatedData);
    } catch (error) {
      console.warn("Error refetching program data:", error);
    }
  }, [programId, effectiveChainId, processProgramData]);

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
    if (readOnly) {
      toast.error("You don't have permission to edit this program");
      return;
    }
    if (!isConnected || !isAuth) {
      login?.();
      toast.error("Authentication required");
      return;
    }
    if (!address || !program) {
      toast.error("Program data not loaded");
      return;
    }

    const programIdToUpdate = programId || ProgramRegistryService.extractProgramId(program);
    if (!programIdToUpdate) {
      toast.error("Program ID not found");
      return;
    }

    setIsLoading(true);
    try {
      const metadata = buildUpdateMetadata(data, program.metadata);
      await ProgramRegistryService.updateProgram(programIdToUpdate, metadata);
      toast.success("Program details saved!");
      await refetchProgramData();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      errorManager(MESSAGES.PROGRAM_REGISTRY.EDIT.ERROR(data.name), error, {
        address,
        data,
        programId,
      });
      toast.error(`Failed to save: ${errorMessage}`);
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
        <p className="text-sm text-red-500 mb-4">{programError}</p>
        <Button variant="secondary" onClick={fetchProgram}>
          Retry
        </Button>
      </div>
    );
  }

  if (!program) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <p className="text-sm text-gray-500">Program not found.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Program Name */}
      <div className="flex w-full flex-col gap-1.5">
        <Label htmlFor="program-name">
          Program Name <span className="text-red-500">*</span>
        </Label>
        <Input
          id="program-name"
          placeholder="Ex: Builder Growth Program"
          {...register("name")}
          disabled={isDisabled}
        />
        {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
      </div>

      {/* Program Description */}
      <Controller
        name="description"
        control={control}
        render={({ field: { onChange, onBlur, value }, fieldState }) => (
          <div className="flex w-full flex-col gap-1.5">
            <MarkdownEditor
              label="Program Description"
              placeholder="Describe your funding program..."
              value={value || ""}
              onChange={onChange}
              onBlur={onBlur}
              error={fieldState.error?.message}
              isRequired
              isDisabled={isDisabled}
              height={150}
              minHeight={120}
            />
          </div>
        )}
      />

      {/* Short Description */}
      <Controller
        name="shortDescription"
        control={control}
        render={({ field: { onChange, onBlur, value }, fieldState }) => (
          <div className="flex w-full flex-col gap-1.5">
            <MarkdownEditor
              label="Short Description"
              description="100 characters max - shown in program cards"
              placeholder="Brief description..."
              value={value || ""}
              onChange={(val) => {
                if (val.length <= SHORT_DESCRIPTION_MAX_LENGTH) onChange(val);
              }}
              onBlur={onBlur}
              error={fieldState.error?.message}
              isRequired
              isDisabled={isDisabled}
              height={80}
              minHeight={60}
            />
            <p className="text-xs text-gray-500 text-right">
              {shortDescription?.length || 0}/{SHORT_DESCRIPTION_MAX_LENGTH}
            </p>
          </div>
        )}
      />

      {/* Dates Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Controller
          name="dates.startsAt"
          control={control}
          render={({ field, formState }) => {
            const datePickerProps = createDatePickerProps("startsAt", field);
            return (
              <div className="flex w-full flex-col gap-1.5">
                <Label>Start Date</Label>
                <DatePicker
                  selected={field.value}
                  onSelect={datePickerProps.onSelect}
                  placeholder="Pick a date"
                  buttonClassName={`w-full ${isDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
                  clearButtonFn={datePickerProps.clearButtonFn}
                />
                {formState.errors.dates?.startsAt && (
                  <p className="text-sm text-red-500">{formState.errors.dates.startsAt.message}</p>
                )}
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
              <div className="flex w-full flex-col gap-1.5">
                <Label>End Date (Deadline)</Label>
                <DatePicker
                  selected={field.value}
                  onSelect={datePickerProps.onSelect}
                  minDate={startDate}
                  placeholder="Pick a date"
                  buttonClassName={`w-full ${isDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
                  clearButtonFn={datePickerProps.clearButtonFn}
                />
                {formState.errors.dates?.endsAt && (
                  <p className="text-sm text-red-500">{formState.errors.dates.endsAt.message}</p>
                )}
              </div>
            );
          }}
        />
      </div>

      {/* Budget */}
      <div className="flex w-full flex-col gap-1.5">
        <Label htmlFor="program-budget">Program Budget (optional)</Label>
        <Input
          id="program-budget"
          type="number"
          min="0"
          step="1"
          placeholder="Ex: 100000"
          {...register("budget")}
          disabled={isDisabled}
        />
        {errors.budget && <p className="text-sm text-red-500">{errors.budget.message}</p>}
      </div>

      {/* Save Button */}
      {!readOnly && (
        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={!isDirty || isSubmitting || isLoading}>
            {isSubmitting || isLoading ? "Saving..." : "Save Program Details"}
          </Button>
        </div>
      )}
    </form>
  );
}
