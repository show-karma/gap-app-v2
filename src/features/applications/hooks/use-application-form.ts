"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import type { ApplicationQuestion } from "@/types/whitelabel-entities";
import { buildDynamicSchema } from "../lib/zod-schema-builder";
import type { ApplicationFormData } from "../types";

interface UseApplicationFormOptions {
  initialData?: ApplicationFormData;
}

export function useApplicationForm(
  questions: ApplicationQuestion[],
  options?: UseApplicationFormOptions
) {
  const schema = useMemo(() => buildDynamicSchema(questions), [questions]);

  const {
    control,
    handleSubmit,
    // Subscribe ONLY to `errors`. Reading `isValid` (or `isDirty`) from
    // formState makes RHF run the resolver on every state change to keep
    // those proxy props fresh — including useFieldArray.append, which
    // would flag every required sub-field on a fresh milestone the moment
    // the user clicked "Add Milestone", before they had a chance to type.
    formState: { errors },
    setValue,
    getValues,
    trigger,
    reset,
    watch,
  } = useForm<ApplicationFormData>({
    resolver: zodResolver(schema),
    defaultValues: options?.initialData || {},
    // mode: 'onSubmit' — RHF's useFieldArray has an internal effect that
    // fires the resolver on every append/remove whenever mode != 'onSubmit',
    // regardless of submission state. That made clicking "Add Milestone"
    // immediately flag every required sub-field on the new (empty) row.
    // The custom Inputs/MarkdownEditor in MilestoneItem don't propagate
    // onBlur to RHF anyway, so onBlur mode was a no-op in practice.
    mode: "onSubmit",
  });

  useEffect(() => {
    if (options?.initialData && Object.keys(options.initialData).length > 0) {
      reset(options.initialData);
    } else {
      reset({});
    }
  }, [options?.initialData, reset]);

  const updateField = useCallback(
    (questionId: string, value: unknown) => {
      setValue(questionId, value, {
        shouldValidate: true,
        shouldDirty: true,
      });
    },
    [setValue]
  );

  const validateField = useCallback(
    async (questionId: string): Promise<string | undefined> => {
      const result = await trigger(questionId);
      return result ? undefined : (errors[questionId]?.message as string);
    },
    [trigger, errors]
  );

  const validateForm = useCallback(async (): Promise<boolean> => {
    return await trigger();
  }, [trigger]);

  const setFormData = useCallback(
    (data: ApplicationFormData) => {
      reset(data, { keepDefaultValues: false });
    },
    [reset]
  );

  const resetForm = useCallback(() => {
    reset({});
  }, [reset]);

  return {
    control,
    handleSubmit,
    watch,
    getValues,
    trigger,

    formState: {
      data: getValues(),
      errors: Object.keys(errors).reduce(
        (acc, key) => {
          const error = errors[key];
          acc[key] = error?.message as string;
          return acc;
        },
        {} as Record<string, string>
      ),
    },

    updateField,
    validateField,
    validateForm,
    setFormData,
    resetForm,
  };
}
