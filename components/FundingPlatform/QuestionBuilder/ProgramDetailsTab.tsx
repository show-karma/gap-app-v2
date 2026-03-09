"use client";
import { DocumentTextIcon } from "@heroicons/react/24/solid";
import { useCallback, useEffect, useState } from "react";
import type { GrantProgram } from "@/components/Pages/ProgramRegistry/ProgramList";
import { errorManager } from "@/components/Utilities/errorManager";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useProgramConfig } from "@/hooks/useFundingPlatform";
import { AdminProgramFormFields } from "@/src/features/program-registry/components/admin-program-form-fields";
import { useAdminProgramForm } from "@/src/features/program-registry/hooks/use-admin-program-form";
import { ProgramRegistryService } from "@/src/features/program-registry/services/program-registry.service";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { PAGE_HEADER_CONTENT, PageHeader } from "../PageHeader";

interface ProgramDetailsTabProps {
  programId: string;
  chainId?: number;
  readOnly?: boolean;
  /** Pre-loaded program data from parent - skips V1 registry fetch when provided */
  initialProgram?: GrantProgram | null;
}

export function ProgramDetailsTab({
  programId,
  chainId,
  readOnly = false,
  initialProgram,
}: ProgramDetailsTabProps) {
  const { data: programConfig } = useProgramConfig(programId);
  const effectiveChainId = chainId ?? programConfig?.chainID;

  const [isLoadingProgram, setIsLoadingProgram] = useState(!initialProgram);
  const [program, setProgram] = useState<GrantProgram | null>(initialProgram || null);
  const [programError, setProgramError] = useState<string | null>(null);

  // Fetch program data if not provided via props
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
      if (data) {
        const programData = Array.isArray(data) ? data[0] : data;
        setProgram(programData as GrantProgram | null);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to load program data";
      setProgramError(errorMessage);
      errorManager("Failed to load program data", error, {
        programId,
        chainId: effectiveChainId,
      });
    } finally {
      setIsLoadingProgram(false);
    }
  }, [programId, effectiveChainId]);

  useEffect(() => {
    if (initialProgram) {
      setProgram(initialProgram);
      setIsLoadingProgram(false);
      return;
    }
    if (programId && effectiveChainId) {
      fetchProgram();
    } else {
      setIsLoadingProgram(false);
    }
  }, [programId, effectiveChainId, fetchProgram, initialProgram]);

  // Refetch after successful update
  const refetchProgramData = useCallback(async () => {
    if (!effectiveChainId) return;
    try {
      const [data, error] = await fetchData(
        INDEXER.REGISTRY.FIND_BY_ID(programId, effectiveChainId)
      );
      if (!error && data) {
        const programData = Array.isArray(data) ? data[0] : data;
        setProgram(programData as GrantProgram | null);
      }
    } catch {
      // Non-critical: silently ignore refetch failures
    }
  }, [programId, effectiveChainId]);

  const programIdToUpdate = programId || ProgramRegistryService.extractProgramId(program!);

  const {
    form,
    onSubmit,
    isSubmitting,
    isDisabled,
    isDirty,
    shortDescription,
    startDate,
    createDatePickerProps,
  } = useAdminProgramForm({
    mode: "update",
    programId: programIdToUpdate || programId,
    existingProgram: program,
    readOnly,
    onSuccess: () => {
      refetchProgramData();
    },
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors },
  } = form;

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
    // If we don't have a chainId yet (waiting for programConfig to load), show loading
    if (!effectiveChainId && !initialProgram) {
      return (
        <div className="flex items-center justify-center py-8">
          <Spinner />
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <p className="text-sm text-muted-foreground mb-4">Program not found.</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <PageHeader
          title={PAGE_HEADER_CONTENT.programDetails.title}
          description={PAGE_HEADER_CONTENT.programDetails.description}
          icon={DocumentTextIcon}
        />
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <AdminProgramFormFields
            control={control}
            register={register}
            errors={errors}
            watch={watch}
            setValue={setValue}
            isDisabled={isDisabled}
            shortDescription={shortDescription}
            startDate={startDate}
            createDatePickerProps={createDatePickerProps}
          />
          <div className="flex justify-end gap-3 pt-4">
            {readOnly ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Button type="button" disabled className="opacity-50 cursor-not-allowed">
                        Save Changes
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>You don't have permission to edit this program</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <Button type="submit" disabled={!isDirty || isSubmitting} isLoading={isSubmitting}>
                Save Changes
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
