"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback, useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { useAccount } from "wagmi";
import type { GrantProgram } from "@/components/Pages/ProgramRegistry/ProgramList";
import { DatePicker } from "@/components/Utilities/DatePicker";
import { errorManager } from "@/components/Utilities/errorManager";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
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
  return sanitizeObject({
    title: formData.name,
    description: formData.description,
    shortDescription: formData.shortDescription,
    programBudget: formData.budget,
    startsAt: formData.dates.startsAt,
    endsAt: formData.dates.endsAt,
    // Preserve existing metadata fields
    website: existingMetadata?.website || "",
    projectTwitter: existingMetadata?.projectTwitter || "",
    socialLinks: existingMetadata?.socialLinks || {
      twitter: "",
      website: "",
      discord: "",
      orgWebsite: "",
      blog: "",
      forum: "",
      grantsSite: "",
      telegram: "",
    },
    bugBounty: existingMetadata?.bugBounty || "",
    categories: existingMetadata?.categories || [],
    ecosystems: existingMetadata?.ecosystems || [],
    organizations: existingMetadata?.organizations || [],
    networks: existingMetadata?.networks || [],
    grantTypes: existingMetadata?.grantTypes || [],
    platformsUsed: existingMetadata?.platformsUsed || [],
    logoImg: existingMetadata?.logoImg || "",
    bannerImg: existingMetadata?.bannerImg || "",
    logoImgData: existingMetadata?.logoImgData || {},
    bannerImgData: existingMetadata?.bannerImgData || {},
    credentials: existingMetadata?.credentials || {},
    type: existingMetadata?.type || "program",
    tags: existingMetadata?.tags || ["karma-gap", "grant-program-registry"],
    status: existingMetadata?.status || "Active",
    communityRef: existingMetadata?.communityRef || [],
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
        // Handle array response (some endpoints return array)
        const programData = Array.isArray(data) ? data[0] : data;
        setProgram(programData as GrantProgram);

        // Populate form with existing data
        const formValues = buildFormValuesFromMetadata((programData as GrantProgram).metadata);
        if (formValues) {
          reset(formValues);
        }
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to load program data";
      setProgramError(errorMessage);
      errorManager("Failed to load program data", error, { programId, chainId });
    } finally {
      setIsLoadingProgram(false);
    }
  }, [programId, chainId, reset]);

  useEffect(() => {
    if (programId && chainId) {
      fetchProgram();
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
        const programData = Array.isArray(updatedData) ? updatedData[0] : updatedData;
        setProgram(programData as GrantProgram);
        const formValues = buildFormValuesFromMetadata((programData as GrantProgram).metadata);
        if (formValues) {
          reset(formValues);
        }
      }
    } catch (error) {
      console.warn("Error refetching program data:", error);
    }
  }, [programId, chainId, reset]);

  const onSubmit = async (data: CreateProgramFormSchema) => {
    const validationError = validateSubmissionPrerequisites();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    const programDbId = ProgramRegistryService.extractProgramId(program!);
    if (!programDbId) {
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

      const [, error] = await fetchData(
        INDEXER.REGISTRY.UPDATE(programDbId, chainId),
        "PUT",
        { metadata },
        {},
        {},
        true
      );

      if (error) {
        throw new Error(error);
      }

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
              placeholder="Ex: Super cool Program"
              {...register("name")}
              disabled={isSubmitting || isLoading || readOnly}
            />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          {/* Program Description */}
          <div className="flex w-full flex-col gap-1">
            <Label htmlFor="program-description">
              Program Description <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="program-description"
              className="min-h-[120px] max-h-[240px] resize-y"
              placeholder="Please provide a description of this program"
              {...register("description")}
              disabled={isSubmitting || isLoading || readOnly}
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description.message}</p>
            )}
          </div>

          {/* Short Description */}
          <div className="flex w-full flex-col gap-1">
            <Label htmlFor="short-description">
              Program Short Description <span className="text-destructive">*</span>
              <span className="text-xs text-muted-foreground ml-2 font-normal">
                (100 characters max)
              </span>
            </Label>
            <Input
              id="short-description"
              placeholder="Brief description (max 100 characters)"
              maxLength={100}
              {...register("shortDescription")}
              disabled={isSubmitting || isLoading || readOnly}
            />
            <div className="flex justify-between items-center">
              {errors.shortDescription && (
                <p className="text-sm text-destructive">{errors.shortDescription.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {watch("shortDescription")?.length || 0}/100
              </p>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <Controller
              name="dates.startsAt"
              control={control}
              render={({ field, formState }) => {
                const isDisabled = isSubmitting || isLoading || readOnly;
                const currentValue = watch("dates.startsAt");
                return (
                  <div className="flex w-full flex-col gap-2">
                    <Label>Start Date (optional)</Label>
                    <DatePicker
                      selected={field.value}
                      onSelect={(date) => {
                        if (isDisabled) return;
                        if (currentValue && formatDate(date) === formatDate(currentValue)) {
                          setValue("dates.startsAt", undefined, { shouldValidate: true });
                          field.onChange(undefined);
                        } else {
                          setValue("dates.startsAt", date, { shouldValidate: true });
                          field.onChange(date);
                        }
                      }}
                      placeholder="Pick a date"
                      buttonClassName={`w-full text-base ${
                        isDisabled ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                      clearButtonFn={() => {
                        setValue("dates.startsAt", undefined, { shouldValidate: true });
                        field.onChange(undefined);
                      }}
                    />
                    {formState.errors.dates?.startsAt && (
                      <p className="text-sm text-destructive">
                        {formState.errors.dates.startsAt.message}
                      </p>
                    )}
                  </div>
                );
              }}
            />

            <Controller
              name="dates.endsAt"
              control={control}
              render={({ field, formState }) => {
                const isDisabled = isSubmitting || isLoading || readOnly;
                const currentValue = watch("dates.endsAt");
                return (
                  <div className="flex w-full flex-col gap-2">
                    <Label>End Date (optional)</Label>
                    <DatePicker
                      selected={field.value}
                      onSelect={(date) => {
                        if (isDisabled) return;
                        if (currentValue && formatDate(date) === formatDate(currentValue)) {
                          setValue("dates.endsAt", undefined, { shouldValidate: true });
                          field.onChange(undefined);
                        } else {
                          setValue("dates.endsAt", date, { shouldValidate: true });
                          field.onChange(date);
                        }
                      }}
                      minDate={watch("dates.startsAt")}
                      placeholder="Pick a date"
                      buttonClassName={`w-full text-base ${
                        isDisabled ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                      clearButtonFn={() => {
                        setValue("dates.endsAt", undefined, { shouldValidate: true });
                        field.onChange(undefined);
                      }}
                    />
                    {formState.errors.dates?.endsAt && (
                      <p className="text-sm text-destructive">
                        {formState.errors.dates.endsAt.message}
                      </p>
                    )}
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
              disabled={isSubmitting || isLoading || readOnly}
            />
            {errors.budget && <p className="text-sm text-destructive">{errors.budget.message}</p>}
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
