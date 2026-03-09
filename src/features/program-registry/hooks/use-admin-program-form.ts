"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import toast from "react-hot-toast";
import { useAccount } from "wagmi";
import type { GrantProgram } from "@/components/Pages/ProgramRegistry/ProgramList";
import { errorManager } from "@/components/Utilities/errorManager";
import { useAuth } from "@/hooks/useAuth";
import type { Community } from "@/types/v2/community";
import { formatDate } from "@/utilities/formatDate";
import { MESSAGES } from "@/utilities/messages";
import { type AdminProgramFormSchema, createProgramSchema } from "../schemas/admin-form";
import { ProgramRegistryService } from "../services/program-registry.service";
import type { CreateProgramFormData } from "../types";

type CreateModeConfig = {
  mode: "create";
  community: Community | null | undefined;
  onSuccess?: (result: { programId?: string }) => void;
};

type UpdateModeConfig = {
  mode: "update";
  programId: string;
  existingProgram: GrantProgram | null;
  readOnly?: boolean;
  onSuccess?: () => void;
};

type UseAdminProgramFormConfig = CreateModeConfig | UpdateModeConfig;

const EMPTY_DEFAULTS: AdminProgramFormSchema = {
  name: "",
  description: "",
  shortDescription: "",
  dates: { startsAt: undefined, endsAt: undefined },
  budget: undefined,
  adminEmails: [],
  financeEmails: [],
  invoiceRequired: false,
};

/**
 * Build form values from existing program metadata (for edit mode).
 */
export function buildFormValuesFromMetadata(
  metadata: GrantProgram["metadata"]
): AdminProgramFormSchema | null {
  if (!metadata) return null;
  return {
    name: metadata.title || "",
    description: metadata.description || "",
    shortDescription: metadata.shortDescription || "",
    dates: {
      startsAt: metadata.startsAt ? new Date(metadata.startsAt) : undefined,
      endsAt: metadata.endsAt ? new Date(metadata.endsAt) : undefined,
    },
    budget:
      metadata.programBudget != null
        ? Number.parseFloat(metadata.programBudget.toString())
        : undefined,
    adminEmails: metadata.adminEmails || [],
    financeEmails: metadata.financeEmails || [],
    invoiceRequired: metadata.invoiceRequired ?? false,
  };
}

export function useAdminProgramForm(config: UseAdminProgramFormConfig) {
  const { address, isConnected } = useAccount();
  const { authenticated: isAuth, login } = useAuth();

  const isUpdate = config.mode === "update";
  const readOnly = isUpdate && config.readOnly === true;

  const form = useForm<AdminProgramFormSchema>({
    resolver: zodResolver(createProgramSchema),
    defaultValues: EMPTY_DEFAULTS,
  });

  const { control, watch, setValue, reset } = form;

  // Optimized watched values for the fields component
  const shortDescription = useWatch({ control, name: "shortDescription" });
  const startDate = useWatch({ control, name: "dates.startsAt" });

  // Populate form from existing program metadata (update mode)
  useEffect(() => {
    if (!isUpdate) return;
    const program = config.existingProgram;
    if (!program) return;
    const values = buildFormValuesFromMetadata(program.metadata);
    if (values) reset(values);
  }, [isUpdate, isUpdate ? config.existingProgram : null, reset]);

  // Date picker helper: toggle date on re-select, or set new date
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
    [watch, setValue]
  );

  const mutation = useMutation({
    mutationFn: async (data: AdminProgramFormSchema) => {
      if (config.mode === "create") {
        if (!config.community) {
          throw new Error("Failed to load community data");
        }
        const metadata = ProgramRegistryService.buildProgramMetadata(
          data as CreateProgramFormData,
          config.community
        );
        return ProgramRegistryService.createProgram(address!, config.community.chainID, metadata);
      }
      if (readOnly) {
        throw new Error("You don't have permission to edit this program");
      }
      if (!config.existingProgram) {
        throw new Error("Program data not loaded");
      }
      const metadata = ProgramRegistryService.buildUpdateMetadata(
        data,
        config.existingProgram.metadata
      );
      await ProgramRegistryService.updateProgram(config.programId, metadata);
      return undefined;
    },
    onSuccess: (result) => {
      if (config.mode === "create") {
        toast.success("Program created successfully!", { duration: 3000 });
        reset();
        config.onSuccess?.({ programId: result?.programId });
      } else {
        toast.success("Program updated successfully!");
        config.onSuccess?.();
      }
    },
    onError: (error: unknown, data) => {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage?.includes("already exists")) {
        toast.error("A program with this name already exists");
      } else if (
        errorMessage === "Failed to load community data" ||
        errorMessage === "You don't have permission to edit this program" ||
        errorMessage === "Program data not loaded"
      ) {
        toast.error(errorMessage);
      } else {
        const msg =
          config.mode === "create"
            ? MESSAGES.PROGRAM_REGISTRY.CREATE.ERROR(data.name)
            : MESSAGES.PROGRAM_REGISTRY.EDIT.ERROR(data.name);
        errorManager(msg, error, {
          address,
          programName: data.name,
          mode: config.mode,
        });
        toast.error(
          config.mode === "create"
            ? "Failed to create program. Please try again."
            : `Failed to update program: ${errorMessage}`
        );
      }
    },
  });

  const isSubmitting = mutation.isPending;
  const isDisabled = useMemo(() => isSubmitting || readOnly, [isSubmitting, readOnly]);

  const onSubmit = useCallback(
    (data: AdminProgramFormSchema) => {
      if (!isConnected || !isAuth) {
        login?.();
        return;
      }
      if (!address) {
        toast.error("Wallet address is required");
        return;
      }
      mutation.mutate(data);
    },
    [address, isConnected, isAuth, login, mutation]
  );

  return {
    form,
    onSubmit,
    isSubmitting,
    isDisabled,
    shortDescription,
    startDate,
    createDatePickerProps,
    isDirty: form.formState.isDirty,
  };
}
